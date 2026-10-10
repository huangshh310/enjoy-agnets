/**
 * 哪些 agent.event 属于当前 Composer run。Extract / 标题补全是旁路。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"

export function isForeignRunId(eventRunId: string | undefined, activeRunId: string | null) {
  return Boolean(eventRunId && activeRunId && eventRunId !== activeRunId)
}

/** 只有 Composer / Agent（kind=agent 或带 prompt）的 run.start 才能认领前台。 */
export function isComposerRunStart(event: StreamEvent): boolean {
  if (event.type !== "run.start") return false
  if (event.kind === "agent") return true
  return Boolean(event.prompt?.trim())
}

export function generationKindOf(
  event: StreamEvent,
  rememberedKind?: string
): string | undefined {
  if (event.type === "run.start" || event.type === "run.end" || event.type === "run.error") {
    if (typeof event.kind === "string" && event.kind.length > 0) return event.kind
  }
  return rememberedKind
}

/** 标题补全等旁路：事件 kind 或 rememberRun 记下的 kind 不是 agent。 */
export function isNonAgentRunKind(event: StreamEvent, rememberedKind?: string): boolean {
  const kind = generationKindOf(event, rememberedKind)
  return typeof kind === "string" && kind.length > 0 && kind !== "agent"
}

export function isRestoreFamilyEvent(event: { type?: string; code?: string; message?: string }): boolean {
  if (event.type !== "run.error" && event.type !== "run.end") return false
  return isRestoreFamilyCode(event.code) || isRestoreFamilyCode(event.message)
}

/** 没有认领 composer runId 时，旁路 end 不得收掉乐观助手轮；空闲只收回挂家族。 */
export function shouldFinalizeComposerRun(
  eventRunId: string | undefined,
  activeRunId: string | null,
  event?: Pick<StreamEvent, "type"> & { code?: string; message?: string; kind?: string },
  rememberedKind?: string
) {
  if (event && isNonAgentRunKind(event as StreamEvent, rememberedKind)) return false
  if (eventRunId && activeRunId && eventRunId === activeRunId) return true
  return Boolean(!activeRunId && eventRunId && event?.type === "run.error" && isRestoreFamilyEvent(event))
}

export function canOpenAssistantTurn(eventRunId: string, activeRunId: string | null) {
  return Boolean(activeRunId && eventRunId === activeRunId)
}

export function shouldBufferComposerEvent(running: boolean, runId: string | null) {
  return running && !runId
}
