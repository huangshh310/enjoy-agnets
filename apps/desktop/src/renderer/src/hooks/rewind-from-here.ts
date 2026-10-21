/**
 * 从某条用户消息重来：先做截断预检（活 run / 尾巴对不上就停，不碰文件），再还原该轮 baseline（失败则停），
 * 最后截断 SQLite 对话。ACP 禁止对话回滚。乐观气泡 id 必须与落库 id 相同。
 * STALE 时只有刷新后尾巴与原名单完全相同才重试（truncate-retry.ts，leo MF-A）。
 * 截断成功之后（#159 F1，leo BLOCK）：**先**把原话 + 图写回输入框（composer-writeback merge：不冲掉已有的字、图按 id 去重），
 * 前台已换会话（中间有 await）就按行合并进**原会话**的草稿；同会话但正在组字 / 发送占锁就等一下再合并一次，
 * 合并成功**才**改消息列表。整段包在 try/catch 里：任何一步抛错，原话和图都还在（输入框或原会话草稿），
 * 返回 REWIND_FINISH_FAILED（弹窗收掉、会话重读、toast 告诉用户原话在草稿里）。
 */
import { SessionTruncateFromResult } from "@enjoy-agents/ipc-contract/session-truncate"
import { supportsConversationRollback } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import {
  ListCheckpointsResult,
  pickTurnBaseline,
  RestoreCheckpointResult
} from "@enjoy-agents/ipc-contract/workspace-io"
import type { QueuedComposerAsset } from "./composer-assets"
import { canWriteBackToComposer, writeBackToComposer } from "./composer-writeback"
import { restoreRewindDraft } from "./rewind-draft-fallback"
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
  /** draftSessionId：前台已换会话，原话放进了这个（原）会话的草稿。 */
  | { ok: true; draftSessionId?: string }
  /** keepThread：截断成功但原话一直放不回输入框，消息还留在界面上（别重读会话）。 */
  | { ok: false; code: string; untrackedToDelete?: string[]; keepThread?: boolean }

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
 * 截断已成功、但原话没能放回输入框（收尾抛错 / 一直写不进）：原话在原会话草稿里，弹窗收掉、
 * 会话从库里重读（对话和库一致），toast「已回到这里，但没能放回输入框，原话在草稿里。」（leo #167 ③）。
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

/**
 * 同一会话但写回被拒（组字中 / 发送占着回写锁）时，等输入框能写再合并一次（leo #167 P3/P4）。
 * 轮询而不是订阅：组字状态在 composer-ime（kai 的文件），这里不加监听口子。
 */
const writebackWait = { pollMs: 50, capMs: 60_000 }

/** 测试用：调小等待。 */
export function setRewindWritebackWaitForTest(next: Partial<typeof writebackWait> | null): void {
  writebackWait.pollMs = next?.pollMs ?? 50
  writebackWait.capMs = next?.capMs ?? 60_000
}

/** 等到输入框能按 merge 写（或会话换了 / 到点）。 */
async function waitUntilWritable(sessionId: string): Promise<void> {
  const deadline = Date.now() + writebackWait.capMs
  for (;;) {
    if (useChatStore.getState().sessionId !== sessionId) return
    if (canWriteBackToComposer("merge", { expectSessionId: sessionId })) return
    if (Date.now() >= deadline) return
    await new Promise((resolve) => setTimeout(resolve, writebackWait.pollMs))
  }
}

/**
 * 截断已成功：先保住原话，再改消息列表（leo #159 F1 / #167 BLOCK）。
 * - 写回：composer-writeback merge + expectSessionId。
 *   - session-changed（中间切了会话）→ 按行合并进**原会话**草稿（restoreRewindDraft），绝不进别的会话的输入框；
 *     当前会话的消息不碰；返回 ok + draftSessionId（弹窗提示一句「原话在原来那个对话的草稿里」）。
 *   - 同一会话但被拒（组字中 / 回写锁）→ 等输入框能写再合并**一次**；合并成功才改消息。
 *     等的时候切走了 → 同上进原会话草稿。还是写不进 → 消息不动（原话仍在对话里看得见），
 *     原话按行合并进草稿，返回 REWIND_FINISH_FAILED（keepThread：不重读会话，免得把看得见的那条也收掉）。
 * - 改消息：只在前台仍是原会话时改；只去掉截断时那段尾巴的 id（等待期间新来的消息不动）。
 * - 任何一步抛错：原话还没写成就补写原会话草稿（按行合并）；同会话就从库里重读一次让对话和库一致；
 *   返回 REWIND_FINISH_FAILED，不丢字不丢图。
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
  let restored: { text: string; assets: QueuedComposerAsset[] } = {
    text: visibleUserText(input.target.content) || input.target.content,
    assets: rewindAssets(input.target)
  }
  const cutIds = new Set(input.messages.slice(input.index).map((message) => message.id))
  cutIds.add(input.userMessageId)
  let saved = false
  try {
    // luna P2：main 截断后按剩下的轮次重算了待验收；刷新会话节点，审查条跟着库走。
    void refreshAllWorkspaces().catch(() => undefined)
    const latest = useChatStore.getState()
    const keepIndex =
      latest.sessionId === sessionId ? latest.messages.findIndex((message) => message.id === input.userMessageId) : -1
    const keep = keepIndex >= 0 ? (latest.messages[keepIndex] as RewindMessage) : input.target
    restored = { text: visibleUserText(keep.content) || keep.content, assets: rewindAssets(keep) }
    const content = { text: restored.text, assets: restored.assets }
    const opts = { mode: "merge" as const, expectSessionId: sessionId, focus: false }
    // ① 先写回原话（不冲掉已有的字、图去重）。
    let written = writeBackToComposer(content, opts)
    let deferred = false
    if (!written.ok && written.reason !== "session-changed") {
      // 同会话被拒：等组字结束 / 发送放锁，再合并一次。
      deferred = true
      await waitUntilWritable(sessionId)
      written = writeBackToComposer(content, opts)
    }
    if (!written.ok) {
      restoreRewindDraft(sessionId, restored.text, restored.assets)
      saved = true
      if (written.reason === "session-changed") return { ok: true, draftSessionId: sessionId }
      // 同会话还是写不进：消息不动（原话在对话里还看得见），原话也进了草稿。
      console.warn(`[rewind] ${REWIND_FINISH_FAILED}: writeback ${written.reason}`)
      return { ok: false, code: REWIND_FINISH_FAILED, keepThread: true }
    }
    saved = true
    // ② 合并成功才改消息列表：只改原会话，只去掉截断的那段尾巴。
    const now = useChatStore.getState()
    if (now.sessionId === sessionId) {
      const kept = dropCutTail(now.messages, input.userMessageId, cutIds, input.messages.slice(0, input.index))
      // 重来截掉后面：最后一条用户消息退回更早的一条，这不是用户刚发了一句，别贴底（host #170，一次性记号）。
      // 一条用户消息都不剩时「最后一条用户消息」不会变，不打记号（否则会留给下一次用户自己发送）。
      if (lastUserMessageId(kept)) skipNextSendScroll(sessionId)
      now.setMessages(kept)
      if (!deferred) focusComposerEnd()
    }
    return { ok: true }
  } catch (error) {
    console.warn(`[rewind] ${REWIND_FINISH_FAILED}`, error)
    if (!saved) {
      try {
        restoreRewindDraft(sessionId, restored.text, restored.assets)
      } catch (draftError) {
        console.warn("[rewind] draft fallback failed", draftError)
      }
    }
    // 对话已经截了：同会话先把截掉的尾巴从界面拿掉，再从库里重读一次（再点「重来」不会报「还没落库」）。
    // 只先拿掉不行：库空时同会话回灌会保住界面上的气泡；只重读也不行：同理。
    const now = useChatStore.getState()
    if (now.sessionId === sessionId) {
      try {
        now.setMessages(dropCutTail(now.messages, input.userMessageId, cutIds, input.messages.slice(0, input.index)))
      } catch (dropError) {
        console.warn("[rewind] drop cut tail failed", dropError)
      }
      void Promise.resolve()
        .then(() => loadSession(sessionId, input.sessionTitle))
        .catch((reloadError) => console.warn("[rewind] reload after finish failure failed", reloadError))
    }
    return { ok: false, code: REWIND_FINISH_FAILED }
  }
}

/** 去掉截断时那段尾巴（这条及之后）；等待期间新来的消息留着。找不到这条就退回截断时的快照。 */
function dropCutTail<T extends { id: string }>(
  messages: readonly T[],
  userMessageId: string,
  cutIds: ReadonlySet<string>,
  fallback: readonly T[]
): T[] {
  const at = messages.findIndex((message) => message.id === userMessageId)
  if (at < 0) return [...fallback]
  return [...messages.slice(0, at), ...messages.slice(at).filter((message) => !cutIds.has(message.id))]
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
