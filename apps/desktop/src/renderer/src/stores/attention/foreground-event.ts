/**
 * 事件是否属于当前前台 Composer。纯函数，供分发与测试共用。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { isComposerRunStart } from "../stream-run-scope"

function eventRunId(event: StreamEvent): string | undefined {
  return "runId" in event ? event.runId : undefined
}

export function belongsToForeground(
  event: StreamEvent,
  currentSessionId: string | null,
  currentRunId: string | null,
  running: boolean,
  eventSessionId: string | undefined
): boolean {
  const runId = eventRunId(event)
  if (runId && currentRunId && runId === currentRunId) return true
  if (!eventSessionId || eventSessionId !== currentSessionId) return false
  if (event.type === "run.start") {
    if (!isComposerRunStart(event)) return false
    if (!running) return true
    return !currentRunId || currentRunId === runId
  }
  if (!running) return false
  return !currentRunId || !runId || currentRunId === runId
}
