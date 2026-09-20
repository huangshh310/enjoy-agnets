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
import { isDefaultSessionTitle } from "@renderer/hooks/session-title"
import { getIde, hasIde } from "@renderer/lib/ide"
import { syncReviewGateAfterEvent } from "@renderer/components/ai-chat/review-gate/sync-review-gate"

export { belongsToForeground } from "./foreground-event"

export function dispatchAgentEvent(event: StreamEvent): void {
  const sessionId = resolveEventSessionId(event)
  const runId = eventRunId(event)
  if (sessionId && runId) useAttentionStore.getState().rememberRun(runId, sessionId)
  if (sessionId) {
    const meta = sessionMetaOf(sessionId)
    useAttentionStore.getState().ingest(event, sessionId, meta.title, meta.workspaceId)
  }

  if (event.type === "commands.update") {
    useAcpCommands.getState().setCommands(event.commands)
  }
  if (event.type === "session.config") {
    const current = useChatStore.getState()
    if (!sessionId || sessionId === current.sessionId) current.applyStreamEvent(event)
  }
  if (event.type === "session.title") {
    applyAgentSessionTitle(event.title)
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
  if (belongsToForeground(event, store.sessionId, store.runId, store.running, sessionId)) {
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

function applyAgentSessionTitle(title: string): void {
  const store = useChatStore.getState()
  if (!isDefaultSessionTitle(store.sessionTitle)) return
  const next = title.trim().slice(0, 80)
  if (!next) return
  const sessionId = store.sessionId
  if (!sessionId) return
  store.setSession(sessionId, next)
  if (!hasIde()) return
  void getIde().session.rename({ sessionId, title: next })
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
