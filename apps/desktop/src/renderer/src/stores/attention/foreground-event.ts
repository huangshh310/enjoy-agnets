/**
 * 事件是否属于当前前台 Composer。纯函数，供分发与测试共用。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { isPreOutputFailureCode } from "@enjoy-agents/ipc-contract/pre-output-failure"
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
  if (isCurrentSessionPreOutputError(event)) return true
  if (event.type === "run.start") {
    if (!isComposerRunStart(event)) return false
    if (!running) return true
    return !currentRunId || currentRunId === runId
  }
  if (!running) return false
  return !currentRunId || !runId || currentRunId === runId
}

/** 用户正看着这题：出字前失败必须进前台撕泡，不能停进停车档。 */
function isCurrentSessionPreOutputError(event: StreamEvent): boolean {
  if (event.type !== "run.error") return false
  if (event.preOutput === true) return true
  return isPreOutputFailureCode(event.code)
}
