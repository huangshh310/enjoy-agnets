/**
 * 事件是否属于当前前台 Composer。纯函数，供分发与测试共用。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { isComposerRunStart, isNonAgentRunKind, isRestoreFamilyEvent } from "../stream-run-scope"

function eventRunId(event: StreamEvent): string | undefined {
  return "runId" in event ? event.runId : undefined
}

export function belongsToForeground(
  event: StreamEvent,
  currentSessionId: string | null,
  currentRunId: string | null,
  running: boolean,
  eventSessionId: string | undefined,
  rememberedKind?: string
): boolean {
  const runId = eventRunId(event)
  if (isNonAgentRunKind(event, rememberedKind)) return false
  if (runId && currentRunId && runId === currentRunId) return true
  if (!eventSessionId || eventSessionId !== currentSessionId) return false
  if (event.type === "run.start") {
    if (!isComposerRunStart(event)) return false
    if (!running) return true
    return !currentRunId || currentRunId === runId
  }
  // 重启回挂：Composer 已 idle，approval.required / 回挂家族终态仍要进当前会话。
  if (isIdleSessionRestoreEvent(event.type) && !running) {
    if (event.type === "run.error" || event.type === "run.end") {
      return isRestoreFamilyEvent(event)
    }
    return true
  }
  if (!running) return false
  return !currentRunId || !runId || currentRunId === runId
}

function isIdleSessionRestoreEvent(type: StreamEvent["type"]): boolean {
  return (
    type === "approval.required" ||
    type === "approval.resolved" ||
    type === "run.error" ||
    type === "run.end"
  )
}
