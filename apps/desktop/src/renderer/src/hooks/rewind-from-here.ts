/**
 * 从某条用户消息重来：先做截断预检（活 run / 尾巴对不上就停，不碰文件），再还原该轮 baseline（失败则停），
 * 最后截断 SQLite 对话。ACP 禁止对话回滚。乐观气泡 id 必须与落库 id 相同。
 * STALE 时只有刷新后尾巴与原名单完全相同才重试（truncate-retry.ts，leo MF-A）。
 * 截断成功之后（#159 F1，leo BLOCK）：**先**把原话 + 图写回输入框（composer-writeback merge：不冲掉已有的字、图按 id 去重），
 * 前台已换会话（中间有 await）就写回**原会话**的草稿；**再**改消息列表。整段包在 try/catch 里：
 * 任何一步抛错，原话和图都还在（输入框或原会话草稿），弹窗显示通用失败句。
 */
import { TRUNCATE_STALE_SNAPSHOT } from "@enjoy-agents/ipc-contract/session-truncate"
import { supportsConversationRollback } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import {
  ListCheckpointsResult,
  pickTurnBaseline,
  RestoreCheckpointResult
} from "@enjoy-agents/ipc-contract/workspace-io"
import type { QueuedComposerAsset } from "./composer-assets"
import { writeBackToComposer } from "./composer-writeback"
import { focusComposerEnd } from "./composer-focus"
import { getIde, hasIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { visibleUserText } from "../lib/user-message-text"
import { useChatStore } from "../stores/chat-store"
import { loadSession } from "./session-lifecycle"
import { restoreDraftIntoSession } from "../lib/session-draft-storage"
import { refreshAllWorkspaces } from "./refresh-workspaces"
import { isTruncateRetryable } from "./truncate-notice"
import { resolveTruncateTail } from "./resolve-truncate-tail"
import { decideTruncateRetry } from "./truncate-retry"
import { lastUserMessageId, skipNextSendScroll } from "../components/ai-chat/thread/scroll-on-send"

export type RewindResult =
  | { ok: true }
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
  return finishAfterTruncate({ sessionId, userMessageId: input.userMessageId, target, messages, index })
}

/** 截断后收尾抛错时的 code：弹窗走通用失败句（原话已保住）。 */
export const REWIND_FINISH_FAILED = "REWIND_FINISH_FAILED"

type RewindMessage = {
  id: string
  role: string
  content: string
  createdAt: number
  assets?: Array<{ assetId: string; name: string; mediaType?: string; url?: string }>
}

/**
 * 截断已成功：先保住原话，再改消息列表（leo #159 F1 BLOCK）。
 * - 写回：composer-writeback merge + expectSessionId。session-changed（中间切了会话）或其它拒绝（组字 / 回写锁）
 *   → 写进**原会话**的草稿（restoreDraftIntoSession：与已有草稿按行合并、图按 id 去重），绝不进别的会话的输入框。
 * - 改消息：只在前台仍是原会话时改；切走了就不碰当前会话的列表（原会话下次打开从库里读，已是截断后的）。
 * - 任何一步抛错：原话还没写成就补写原会话草稿；返回 REWIND_FINISH_FAILED（通用句），不丢字不丢图。
 */
async function finishAfterTruncate(input: {
  sessionId: string
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
  let saved = false
  try {
    // luna P2：main 截断后按剩下的轮次重算了待验收；刷新会话节点，审查条跟着库走。
    void refreshAllWorkspaces().catch(() => undefined)
    const latest = useChatStore.getState()
    const sameSession = latest.sessionId === sessionId
    const keepIndex = sameSession ? latest.messages.findIndex((message) => message.id === input.userMessageId) : -1
    const keep = keepIndex >= 0 ? (latest.messages[keepIndex] as RewindMessage) : input.target
    restored = { text: visibleUserText(keep.content) || keep.content, assets: rewindAssets(keep) }
    // ① 先写回原话（不冲掉已有的字、图去重）；写不进当前输入框就进原会话草稿。
    const written = writeBackToComposer(
      { text: restored.text, assets: restored.assets },
      { mode: "merge", expectSessionId: sessionId, focus: false }
    )
    if (!written.ok) restoreDraftIntoSession(sessionId, restored.text, restored.assets)
    saved = true
    // ② 再改消息列表：只改原会话。
    const now = useChatStore.getState()
    if (now.sessionId === sessionId) {
      const nowIndex = now.messages.findIndex((message) => message.id === input.userMessageId)
      const kept = nowIndex >= 0 ? now.messages.slice(0, nowIndex) : input.messages.slice(0, input.index)
      // 重来截掉后面：最后一条用户消息退回更早的一条，这不是用户刚发了一句，别贴底（host #170，一次性记号）。
      // 一条用户消息都不剩时「最后一条用户消息」不会变，不打记号（否则会留给下一次用户自己发送）。
      if (lastUserMessageId(kept)) skipNextSendScroll(sessionId)
      now.setMessages(kept)
      if (written.ok) focusComposerEnd()
    }
    return { ok: true }
  } catch (error) {
    console.warn(`[rewind] ${REWIND_FINISH_FAILED}`, error)
    if (!saved) {
      try {
        restoreDraftIntoSession(sessionId, restored.text, restored.assets)
      } catch (draftError) {
        console.warn("[rewind] draft fallback failed", draftError)
      }
    }
    return { ok: false, code: REWIND_FINISH_FAILED }
  }
}

/** 这条消息的图 → 输入框附件，按 id 去重（同一张图不会进两次托盘）。 */
function rewindAssets(message: RewindMessage): QueuedComposerAsset[] {
  const seen = new Set<string>()
  const out: QueuedComposerAsset[] = []
  for (const asset of message.assets ?? []) {
    if (!asset?.assetId || seen.has(asset.assetId)) continue
    seen.add(asset.assetId)
    out.push({ id: asset.assetId, name: asset.name, mediaType: asset.mediaType, url: asset.url })
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

function truncateBlockedCode(result: unknown): string | null {
  if (result && typeof result === "object" && "ok" in result && (result as { ok?: unknown }).ok === false) {
    return String((result as { code?: string }).code ?? TRUNCATE_STALE_SNAPSHOT)
  }
  return null
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
