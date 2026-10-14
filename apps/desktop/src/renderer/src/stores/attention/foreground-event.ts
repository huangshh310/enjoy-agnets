/**
 * 事件是否属于当前前台 Composer。纯函数，供分发与测试共用。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { isComposerRunStart, isNonAgentRunKind, isRestoreFamilyEvent } from "../stream-run-scope"
import { isPreOutputFailureCode } from "@enjoy-agents/ipc-contract/pre-output-failure"


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
  // leo #147 MF-1：落库 id 回报可能晚于 run.end（收工才首次写行），只认会话，不看 running / runId。
  if (event.type === "message.persisted") return Boolean(eventSessionId) && eventSessionId === currentSessionId
  if (isNonAgentRunKind(event, rememberedKind)) return false
  if (runId && currentRunId && runId === currentRunId) return true
  if (!eventSessionId || eventSessionId !== currentSessionId) return false
  if (isCurrentSessionPreOutputError(event)) return true
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

/** 用户正看着这题：出字前失败必须进前台撕泡，不能停进停车档。 */
function isCurrentSessionPreOutputError(event: StreamEvent): boolean {
  if (event.type !== "run.error") return false
  if (event.preOutput === true) return true
  return isPreOutputFailureCode(event.code)
}
