/**
 * 从某条用户消息重来：先做截断预检（活 run / 尾巴对不上就停，不碰文件），再还原该轮 baseline（失败则停），
 * 最后截断 SQLite 对话。ACP 禁止对话回滚。乐观气泡 id 必须与落库 id 相同。
 * STALE 时只有刷新后尾巴与原名单完全相同才重试（truncate-retry.ts，leo MF-A）。
 */
import { TRUNCATE_STALE_SNAPSHOT } from "@enjoy-agents/ipc-contract/session-truncate"
import { supportsConversationRollback } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import {
  ListCheckpointsResult,
  pickTurnBaseline,
  RestoreCheckpointResult
} from "@enjoy-agents/ipc-contract/workspace-io"
import { queueComposerAsset } from "./composer-assets"
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
  // luna P2：main 截断后按剩下的轮次重算了待验收；刷新会话节点，审查条跟着库走。
  void refreshAllWorkspaces().catch(() => undefined)
  const latest = useChatStore.getState()
  const keepIndex = latest.messages.findIndex((message) => message.id === input.userMessageId)
  const keep = keepIndex >= 0 ? latest.messages[keepIndex] : target
  const kept = keepIndex >= 0 ? latest.messages.slice(0, keepIndex) : messages.slice(0, index)
  // 重来截掉后面：最后一条用户消息退回更早的一条，这不是用户刚发了一句，别贴底（host #170，一次性记号）。
  // 一条用户消息都不剩时「最后一条用户消息」不会变，不打记号（否则会留给下一次用户自己发送）。
  if (lastUserMessageId(kept)) skipNextSendScroll(sessionId)
  latest.setMessages(kept)
  latest.setComposer(visibleUserText(keep.content) || keep.content)
  for (const asset of keep.assets ?? []) {
    queueComposerAsset({
      id: asset.assetId,
      name: asset.name,
      mediaType: asset.mediaType,
      url: asset.url
    })
  }
  focusComposerEnd()
  return { ok: true }
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
