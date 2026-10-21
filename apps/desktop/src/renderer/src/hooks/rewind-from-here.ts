/**
 * 从某条用户消息重来：先做截断预检（活 run / 尾巴对不上就停，不碰文件），再还原该轮 baseline（失败则停），
 * 最后截断 SQLite 对话。ACP 禁止对话回滚。乐观气泡 id 必须与落库 id 相同。
 * STALE 时只有刷新后尾巴与原名单完全相同才重试（truncate-retry.ts，leo MF-A）。
 * 截断成功之后（#159 F1，leo BLOCK）：**先**把原话 + 图写回输入框（composer-writeback merge：不冲掉已有的字、图按 id 去重），
 * 前台已换会话（中间有 await）就按行合并进**原会话**的草稿；同会话但正在组字 / 发送占锁就一直等到写得进
 * （原话先记进「待放回」，切走 / 关窗时落草稿，见 rewind-pending.ts），合并成功**才**改消息列表。
 */
import { SessionTruncateFromResult } from "@enjoy-agents/ipc-contract/session-truncate"
import { supportsConversationRollback } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import {
  ListCheckpointsResult,
  pickTurnBaseline,
  RestoreCheckpointResult
} from "@enjoy-agents/ipc-contract/workspace-io"
import type { QueuedComposerAsset } from "./composer-assets"
import {
  ensurePendingRewindLoop,
  installPendingRewinds,
  onPendingRewindLanded,
  recordPendingRewind,
  settlePendingRewind
} from "./rewind-pending"
import { focusComposerEnd } from "./composer-focus"
import { getIde, hasIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { visibleUserText } from "../lib/user-message-text"
import { useChatStore } from "../stores/chat-store"
import { loadSession } from "./session-lifecycle"
import { refreshAllWorkspaces } from "./refresh-workspaces"
import { isTruncateRetryable } from "./truncate-notice"
import { resolveTruncateTail } from "./resolve-truncate-tail"
import { decideTruncateRetry } from "./truncate-retry"
import { lastUserMessageId, skipNextSendScroll } from "../components/ai-chat/thread/scroll-on-send"

export type RewindResult =
  /**
   * draftSessionId：前台已换会话，原话放进了这个（原）会话的草稿。
   * writebackPending：同会话正在组字 / 发送占锁，原话已存好，稍后放回输入框（消息到那时才拿掉）。
   */
  | { ok: true; draftSessionId?: string; writebackPending?: boolean }
  | { ok: false; code: string; untrackedToDelete?: string[] }

export function canRewindConversation(runtimeId: string | undefined): boolean {
  return supportsConversationRollback(runtimeId)
}

export async function rewindFromUserTurn(input: {
  userMessageId: string
  restoreFiles: boolean
  confirmDeleteUntracked?: boolean
}): Promise<RewindResult> {
  const store = useChatStore.getState()
  if (store.running || !hasIde() || !store.sessionId) {
    return { ok: false, code: "REWIND_BUSY" }
  }
  if (!canRewindConversation(store.runtimeId)) {
    return { ok: false, code: "REWIND_PROVIDER_UNSUPPORTED" }
  }
  const messages = store.messages
  const index = messages.findIndex((message) => message.id === input.userMessageId)
  const target = messages[index]
  if (!target || target.role !== "user") return { ok: false, code: "REWIND_MESSAGE_NOT_FOUND" }

  const sessionId = store.sessionId
  const sessionTitle = store.sessionTitle ?? ""
  // jojo P1 / leo #147 MF-1：名单只用权威 id（库 id / persistedId / 按 runId 严格绑上的库行）；库里多出来就 STALE →「有新内容」。
  const expectedTailIds = await resolveTruncateTail({ sessionId, messages, anchorId: target.id, mode: "from" })
  if (useChatStore.getState().running || useChatStore.getState().sessionId !== sessionId) {
    return { ok: false, code: "REWIND_BUSY" }
  }
  const guarded = (dryRun: boolean) =>
    truncateWithGuardedRetry({ sessionId, sessionTitle, messageId: target.id, expectedTailIds, dryRun })

  if (input.restoreFiles) {
    // soft 4：活 run / 尾巴对不上先停，不能先改盘再发现截不了。
    const precheck = await guarded(true)
    if (precheck) return { ok: false, code: precheck }
    const files = await restoreTurnFiles(target.createdAt, messages, index, input.confirmDeleteUntracked)
    if (!files.ok) return files
  }

  const cut = await guarded(false)
  if (cut) return { ok: false, code: cut }
  return finishAfterTruncate({ sessionId, sessionTitle, userMessageId: input.userMessageId, target, messages, index })
}

/**
 * 截断已成功、但写回输入框本身抛错：原话在「待放回」记录里（rewind-pending），会继续放回这个会话的输入框，
 * 切走 / 关窗时并进它的草稿。弹窗收掉 + toast（不说「已在草稿里」，那时还不是，leo #167 r3）。
 */
export const REWIND_FINISH_FAILED = "REWIND_FINISH_FAILED"

/** truncateFrom 回来的东西不合约（zod 校验不过）：按失败处理，走通用句。 */
export const REWIND_TRUNCATE_RESULT_INVALID = "REWIND_TRUNCATE_RESULT_INVALID"

type RewindMessage = {
  id: string
  role: string
  content: string
  createdAt: number
  assets?: Array<{ assetId: string; name: string; mediaType?: string; url?: string; size?: number }>
}

installPendingRewinds()

/** 还在等写回的会话 → 截断时记下的 id（落地后才从界面拿掉）。 */
const waitingCutIds = new Map<string, Set<string>>()

/**
 * 截断已成功：先保住原话，再改消息列表（leo #159 F1 / #167 r2 / r3 BLOCK）。
 * - 截断一成功就记「待放回」（rewind-pending：内存 + 自己的 localStorage 键，输入框不会盖掉它）。
 * - 立刻试一次：
 *   - 前台还是这个会话且写得进 → 进输入框（merge），删记录，再把截掉的尾巴从界面拿掉（按截断时记下的 id）。
 *   - 前台已换会话 → 按行并进原会话草稿（这时输入框不再拥有它），返回 draftSessionId。
 *   - 同会话写不进（组字 / 回写锁）→ **不退回草稿**（输入框拥有那份草稿，下一次按键就盖掉）。
 *     记录留着、后台一直等到写得进为止（切走就并进原会话草稿；关窗就落草稿并送到 main）；
 *     消息先留着，放进输入框后才拿掉。弹窗立刻收掉、提示「原话稍后放回输入框」（writebackPending），
 *     不会因为等写回而显示「从这里重来失败」。
 * - 写回已成功、之后改消息列表抛错（Q9）→ 原话已在输入框：从库里重读会话，返回 ok（不说「没能放回」）。
 * - 写回本身抛错 → 记录还在、后台继续放；返回 REWIND_FINISH_FAILED（toast 说「原话已保存，会放回」）。
 */
async function finishAfterTruncate(input: {
  sessionId: string
  sessionTitle: string
  userMessageId: string
  target: RewindMessage
  messages: ReturnType<typeof useChatStore.getState>["messages"]
  index: number
}): Promise<RewindResult> {
  const { sessionId } = input
  const cutIds = new Set(input.messages.slice(input.index).map((message) => message.id))
  cutIds.add(input.userMessageId)
  let restored: { text: string; assets: QueuedComposerAsset[] } = {
    text: visibleUserText(input.target.content) || input.target.content,
    assets: rewindAssets(input.target)
  }
  try {
    const latest = useChatStore.getState()
    const keepIndex =
      latest.sessionId === sessionId ? latest.messages.findIndex((message) => message.id === input.userMessageId) : -1
    const keep = keepIndex >= 0 ? (latest.messages[keepIndex] as RewindMessage) : input.target
    restored = { text: visibleUserText(keep.content) || keep.content, assets: rewindAssets(keep) }
  } catch {
    // 用截断前的那条
  }
  // ⓪ 先有持久副本，再做别的。
  recordPendingRewind(sessionId, restored.text, restored.assets)
  // 同会话上一次重来还在等：两次截掉的 id 一起拿掉（记录本身已按行合并成一条）。
  for (const id of waitingCutIds.get(sessionId) ?? []) cutIds.add(id)
  waitingCutIds.set(sessionId, cutIds)
  onPendingRewindLanded(sessionId, (sid, outcome) => {
    waitingCutIds.delete(sid)
    if (outcome === "composer") dropCutTailFromView(sid, cutIds)
  })
  // luna P2：main 截断后按剩下的轮次重算了待验收；刷新会话节点，审查条跟着库走。
  void refreshAllWorkspaces().catch(() => undefined)
  let outcome: ReturnType<typeof settlePendingRewind>
  try {
    outcome = settlePendingRewind(sessionId)
  } catch (error) {
    console.warn(`[rewind] ${REWIND_FINISH_FAILED}`, error)
    ensurePendingRewindLoop()
    return { ok: false, code: REWIND_FINISH_FAILED }
  }
  if (outcome === "draft") {
    waitingCutIds.delete(sessionId)
    onPendingRewindLanded(sessionId, () => undefined)
    return { ok: true, draftSessionId: sessionId }
  }
  if (outcome === "waiting") {
    ensurePendingRewindLoop()
    return { ok: true, writebackPending: true }
  }
  // 已进输入框。
  waitingCutIds.delete(sessionId)
  onPendingRewindLanded(sessionId, () => undefined)
  try {
    dropCutTailFromView(sessionId, cutIds, true)
    focusComposerEnd()
  } catch (error) {
    // Q9：原话已经在输入框里了，只是界面没改好——从库里重读，别说「没能放回」。
    console.warn("[rewind] update thread after write-back failed", error)
    if (useChatStore.getState().sessionId === sessionId) {
      void Promise.resolve()
        .then(() => loadSession(sessionId, input.sessionTitle))
        .catch((reloadError) => console.warn("[rewind] reload after thread update failure failed", reloadError))
    }
  }
  return { ok: true }
}

/**
 * 把截断时记下的那段尾巴（这条及之后，按 id / persistedId）从界面拿掉；别的消息（等待期间新来的、
 * 重读后回来的）都不动（Q5：不再退回截断时的快照）。只改前台就是这个会话的情况。
 */
function dropCutTailFromView(sessionId: string, cutIds: ReadonlySet<string>, rethrow = false): void {
  try {
    const now = useChatStore.getState()
    if (now.sessionId !== sessionId) return
    const next = now.messages.filter(
      (message) => !cutIds.has(message.id) && !((message as { persistedId?: string }).persistedId && cutIds.has((message as { persistedId?: string }).persistedId!))
    )
    if (next.length !== now.messages.length) {
      const kept = next
      // 重来截掉后面：最后一条用户消息退回更早的一条，这不是用户刚发了一句，别贴底（host #170，一次性记号）。
      if (lastUserMessageId(kept)) skipNextSendScroll(sessionId)
      now.setMessages(kept)
    }
  } catch (error) {
    if (rethrow) throw error
    console.warn("[rewind] drop cut tail failed", error)
  }
}

/** 这条消息的图 → 输入框附件，按 id 去重（同一张图不会进两次托盘）。 */
function rewindAssets(message: RewindMessage): QueuedComposerAsset[] {
  const seen = new Set<string>()
  const out: QueuedComposerAsset[] = []
  for (const asset of message.assets ?? []) {
    if (!asset?.assetId || seen.has(asset.assetId)) continue
    seen.add(asset.assetId)
    const size = typeof asset.size === "number" && Number.isFinite(asset.size) ? asset.size : undefined
    out.push({
      id: asset.assetId,
      name: asset.name,
      mediaType: asset.mediaType,
      url: asset.url,
      ...(size !== undefined ? { size } : {})
    })
  }
  return out
}

async function restoreTurnFiles(
  from: number,
  messages: Array<{ role: string; createdAt: number }>,
  index: number,
  confirmDeleteUntracked?: boolean
): Promise<RewindResult> {
  const store = useChatStore.getState()
  if (!store.workspaceId || !store.sessionId) return { ok: false, code: "REWIND_NO_WORKSPACE" }
  let baseline: ListCheckpointsResult["checkpoints"][number] | null | undefined
  try {
    const listed = ListCheckpointsResult.parse(
      await getIde().workspace.listCheckpoints({ workspaceId: store.workspaceId })
    )
    baseline = pickTurnBaseline(listed.checkpoints, {
      sessionId: store.sessionId,
      from,
      until: nextUserCreatedAt(messages, index)
    })
  } catch (error) {
    // 列记录出错时还没碰文件：按「找不到记录」灰字兜底；原始错误只进日志。
    console.warn("[rewind] REWIND_LIST_FAILED", error)
    return { ok: false, code: "REWIND_LIST_FAILED" }
  }
  if (!baseline) return { ok: false, code: "REWIND_NO_CHECKPOINT" }
  try {
    const restored = RestoreCheckpointResult.parse(
      await getIde().workspace.restoreCheckpoint({
        workspaceId: store.workspaceId,
        ref: baseline.ref,
        confirmDeleteUntracked
      })
    )
    if (!restored.ok) {
      return { ok: false, code: restored.code, untrackedToDelete: restored.untrackedToDelete }
    }
  } catch (error) {
    // 原始错误不进弹窗：统一成 REWIND_RESTORE_FAILED，弹窗用琥珀色提示 +「去审查」（luna ①）；原文只进日志。
    console.warn("[rewind] REWIND_RESTORE_FAILED", error)
    return { ok: false, code: "REWIND_RESTORE_FAILED" }
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["changes", store.workspaceId] }),
    queryClient.invalidateQueries({ queryKey: ["checkpoints", store.workspaceId] })
  ])
  return { ok: true }
}

/**
 * 截断（或 dryRun 预检）。STALE：刷新，尾巴与原名单完全相同才带原名单重试一次；否则 TRUNCATE_TAIL_CHANGED。
 * 返回 null 表示通过。
 */
async function truncateWithGuardedRetry(input: {
  sessionId: string
  sessionTitle: string
  messageId: string
  expectedTailIds: string[]
  dryRun: boolean
}): Promise<string | null> {
  const call = () =>
    getIde().session.truncateFrom({
      sessionId: input.sessionId,
      messageId: input.messageId,
      expectedTailIds: input.expectedTailIds,
      ...(input.dryRun ? { dryRun: true } : {})
    })
  try {
    const firstCode = truncateBlockedCode(await call())
    if (!firstCode) return null
    if (!isTruncateRetryable(firstCode)) return firstCode
    await loadSession(input.sessionId, input.sessionTitle)
    const decision = decideTruncateRetry({
      mode: "from",
      anchorId: input.messageId,
      expectedTailIds: input.expectedTailIds,
      refreshedIds: useChatStore.getState().messages.map((message) => message.id)
    })
    if (!decision.retry) return decision.code
    return truncateBlockedCode(await call())
  } catch (error) {
    return error instanceof Error ? error.message : "TRUNCATE_MESSAGE_NOT_FOUND"
  }
}

/** truncateFrom 的结果按合约校验（zod）：通过返回 null；被拒返回它的 code；不合约按失败（通用句）。 */
function truncateBlockedCode(result: unknown): string | null {
  const parsed = SessionTruncateFromResult.safeParse(result)
  if (!parsed.success) {
    console.warn(`[rewind] ${REWIND_TRUNCATE_RESULT_INVALID}`, parsed.error.issues)
    return REWIND_TRUNCATE_RESULT_INVALID
  }
  return parsed.data.ok ? null : parsed.data.code
}

function nextUserCreatedAt(
  messages: Array<{ role: string; createdAt: number }>,
  index: number
): number | undefined {
  for (let cursor = index + 1; cursor < messages.length; cursor += 1) {
    if (messages[cursor]?.role === "user") return messages[cursor]?.createdAt
  }
  return undefined
}
