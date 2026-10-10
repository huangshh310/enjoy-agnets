/**
 * 从某条用户消息重来：先还原该轮 baseline（失败则停），再截断 SQLite 对话。
 * ACP 禁止对话回滚。乐观气泡 id 必须与落库 id 相同。
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
import { isTruncateRetryable } from "./truncate-notice"

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

  if (input.restoreFiles) {
    const files = await restoreTurnFiles(target.createdAt, messages, index, input.confirmDeleteUntracked)
    if (!files.ok) return files
  }

  const expectedTailIds = messages.slice(index).map((message) => message.id)
  try {
    const first = await getIde().session.truncateFrom({
      sessionId: store.sessionId,
      messageId: target.id,
      expectedTailIds
    })
    const firstCode = truncateBlockedCode(first)
    if (firstCode && isTruncateRetryable(firstCode)) {
      await loadSession(store.sessionId, store.sessionTitle ?? "")
      const refreshed = useChatStore.getState()
      const nextIndex = refreshed.messages.findIndex((message) => message.id === input.userMessageId)
      const next = refreshed.messages[nextIndex]
      if (!next || next.role !== "user") return { ok: false, code: TRUNCATE_STALE_SNAPSHOT }
      const retried = await getIde().session.truncateFrom({
        sessionId: store.sessionId,
        messageId: next.id,
        expectedTailIds: refreshed.messages.slice(nextIndex).map((message) => message.id)
      })
      const retryCode = truncateBlockedCode(retried)
      if (retryCode) return { ok: false, code: retryCode }
    } else if (firstCode) {
      return { ok: false, code: firstCode }
    }
  } catch (error) {
    return { ok: false, code: error instanceof Error ? error.message : "TRUNCATE_MESSAGE_NOT_FOUND" }
  }
  const latest = useChatStore.getState()
  const keepIndex = latest.messages.findIndex((message) => message.id === input.userMessageId)
  const keep = keepIndex >= 0 ? latest.messages[keepIndex] : target
  latest.setMessages(keepIndex >= 0 ? latest.messages.slice(0, keepIndex) : messages.slice(0, index))
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
  const listed = ListCheckpointsResult.parse(
    await getIde().workspace.listCheckpoints({ workspaceId: store.workspaceId })
  )
  const baseline = pickTurnBaseline(listed.checkpoints, {
    sessionId: store.sessionId,
    from,
    until: nextUserCreatedAt(messages, index)
  })
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
    return { ok: false, code: error instanceof Error ? error.message : "CHECKPOINT_RESTORE_FAILED" }
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["changes", store.workspaceId] }),
    queryClient.invalidateQueries({ queryKey: ["checkpoints", store.workspaceId] })
  ])
  return { ok: true }
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
