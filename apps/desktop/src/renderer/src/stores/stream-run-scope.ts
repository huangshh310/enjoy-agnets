/**
 * 哪些 agent.event 属于当前 Composer run。Extract / 标题补全是旁路。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

export function isForeignRunId(eventRunId: string | undefined, activeRunId: string | null) {
  return Boolean(eventRunId && activeRunId && eventRunId !== activeRunId)
}

/** 只有 Composer / Agent（kind=agent 或带 prompt）的 run.start 才能认领前台。 */
export function isComposerRunStart(event: StreamEvent): boolean {
  if (event.type !== "run.start") return false
  if (event.kind === "agent") return true
  return Boolean(event.prompt?.trim())
}

/** 没有认领 composer runId 时，旁路 end 不得收掉乐观助手轮。 */
export function shouldFinalizeComposerRun(eventRunId: string | undefined, activeRunId: string | null) {
  return Boolean(eventRunId && activeRunId && eventRunId === activeRunId)
}

export function canOpenAssistantTurn(eventRunId: string, activeRunId: string | null) {
  return Boolean(activeRunId && eventRunId === activeRunId)
}

export function shouldBufferComposerEvent(running: boolean, runId: string | null) {
  return running && !runId
}
