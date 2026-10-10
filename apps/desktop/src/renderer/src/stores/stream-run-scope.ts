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

/** 标题补全等旁路：带了非 agent 的 kind 就不是 Composer 轮。 */
export function isNonAgentRunKind(event: StreamEvent): boolean {
  if (!("kind" in event)) return false
  const kind = event.kind
  return typeof kind === "string" && kind.length > 0 && kind !== "agent"
}

/** 没有认领 composer runId 时，旁路 end 不得收掉乐观助手轮；回挂 run.error 除外。 */
export function shouldFinalizeComposerRun(
  eventRunId: string | undefined,
  activeRunId: string | null,
  event?: Pick<StreamEvent, "type">
) {
  if (eventRunId && activeRunId && eventRunId === activeRunId) return true
  return Boolean(!activeRunId && eventRunId && event?.type === "run.error")
}

export function canOpenAssistantTurn(eventRunId: string, activeRunId: string | null) {
  return Boolean(activeRunId && eventRunId === activeRunId)
}

export function shouldBufferComposerEvent(running: boolean, runId: string | null) {
  return running && !runId
}
