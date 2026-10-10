/**
 * 所有 agent.event 先归 Attention，再决定写前台线程还是停车。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../chat-store"
import { belongsToForeground } from "./foreground-event"
import { eventRunId } from "./ingest-attention"
import { useAttentionStore } from "./attention-store"
import { useAcpCommands } from "../acp-commands"
import { useHostInjectStore } from "../host-inject/host-inject-store"
import { patchSessionTitle } from "@renderer/hooks/session-title"
import { shouldRefineSessionTitle } from "@renderer/lib/session-title"
import { visibleUserText } from "@renderer/lib/user-message-text"
import { getIde, hasIde } from "@renderer/lib/ide"
import { lastTurnDeniedOnly } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { omitCompleteFromTurn } from "@renderer/components/ai-chat/review-gate/turn-from-event"
import { syncReviewGateAfterEvent } from "@renderer/components/ai-chat/review-gate/sync-review-gate"
import { clearSessionUsage, rememberSessionUsage } from "../session-usage"

export { belongsToForeground } from "./foreground-event"

export function dispatchAgentEvent(event: StreamEvent): void {
  const sessionId = resolveEventSessionId(event)
  const runId = eventRunId(event)
  if (sessionId && runId) useAttentionStore.getState().rememberRun(runId, sessionId)
  const storeEarly = useChatStore.getState()
  const foreground = belongsToForeground(
    event,
    storeEarly.sessionId,
    storeEarly.runId,
    storeEarly.running,
    sessionId
  )
  if (sessionId) {
    const meta = sessionMetaOf(sessionId)
    useAttentionStore.getState().ingest(event, sessionId, meta.title, meta.workspaceId, {
      omitComplete: omitCompleteFromTurn(
        event,
        foreground && event.type === "run.end" && lastTurnDeniedOnly(storeEarly.messages)
      ),
      foreground
    })
  }

  if (sessionId && event.type === "run.start") clearSessionUsage(sessionId)
  if (event.type === "usage.updated" && sessionId) {
    const chat = useChatStore.getState()
    rememberSessionUsage(sessionId, event, sessionId === chat.sessionId ? chat.runtimeId : undefined)
  }
  if (event.type === "commands.update") {
    useAcpCommands.getState().setCommands(event.commands)
  }
  if (event.type === "session.config") {
    const current = useChatStore.getState()
    if (!sessionId || sessionId === current.sessionId) current.applyStreamEvent(event)
  }
  if (event.type === "session.title") {
    applyAgentSessionTitle(event.title, sessionId)
  }
  if (event.type === "host.inject" && sessionId) {
    useHostInjectStore.getState().remember(sessionId, {
      runId: event.runId,
      runtimeId: event.runtimeId,
      mcp: event.mcp,
      skills: event.skills
    })
  }

  const store = useChatStore.getState()
  if (foreground) {
    store.applyStreamEvent(event)
    syncReviewGateAfterEvent(event, sessionId, true)
    return
  }
  if (sessionId) useAttentionStore.getState().applyParkEvent(sessionId, event)
  syncReviewGateAfterEvent(event, sessionId, false)
}

export function resolveEventSessionId(event: StreamEvent): string | undefined {
  if (event.sessionId) return event.sessionId
  const runId = eventRunId(event)
  const mapped = useAttentionStore.getState().sessionOfRun(runId)
  if (mapped) return mapped
  const store = useChatStore.getState()
  if (runId && store.runId === runId && store.sessionId) return store.sessionId
  return undefined
}

function applyAgentSessionTitle(title: string, sessionId?: string): void {
  const store = useChatStore.getState()
  const targetId = sessionId ?? store.sessionId
  if (!targetId) return
  const next = title.trim().slice(0, 80)
  if (!next) return
  const node = store.repositories.find((item) => item.id === targetId)
  const current = node?.name ?? (store.sessionId === targetId ? store.sessionTitle : "")
  const lastUser =
    store.sessionId === targetId
      ? [...store.messages].reverse().find((row) => row.role === "user")?.content
      : undefined
  const userText = lastUser ? visibleUserText(lastUser) : ""
  if (!shouldRefineSessionTitle(current, userText)) return
  patchSessionTitle(targetId, next)
  if (!hasIde()) return
  void getIde().session.rename({ sessionId: targetId, title: next }).catch(() => undefined)
}

function sessionMetaOf(sessionId: string): { title: string; workspaceId?: string } {
  const store = useChatStore.getState()
  const node = store.repositories.find((item) => item.id === sessionId)
  const current = store.sessionId === sessionId
  return {
    title: node?.name ?? (current ? store.sessionTitle : sessionId),
    workspaceId: node?.workspaceId ?? node?.parentId ?? (current ? store.workspaceId ?? undefined : undefined)
  }
}
