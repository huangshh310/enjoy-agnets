/**
 * 所有 agent.event 先归 Attention，再决定写前台线程还是停车。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../chat-store"
import { belongsToForeground } from "./foreground-event"
import { eventRunId } from "./ingest-attention"
import { useAttentionStore } from "./attention-store"

export { belongsToForeground } from "./foreground-event"

export function dispatchAgentEvent(event: StreamEvent): void {
  const sessionId = resolveEventSessionId(event)
  const runId = eventRunId(event)
  if (sessionId && runId) useAttentionStore.getState().rememberRun(runId, sessionId)
  if (sessionId) {
    useAttentionStore.getState().ingest(event, sessionId, sessionTitleOf(sessionId))
  }

  const store = useChatStore.getState()
  if (belongsToForeground(event, store.sessionId, store.runId, store.running, sessionId)) {
    store.applyStreamEvent(event)
    return
  }
  if (sessionId) useAttentionStore.getState().applyParkEvent(sessionId, event)
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

function sessionTitleOf(sessionId: string): string {
  const node = useChatStore.getState().repositories.find((item) => item.id === sessionId)
  return node?.name ?? sessionId
}
