/**
 * 哪些 agent.event 属于当前 Composer run。Extract / 标题补全是旁路。
 */

export function isForeignRunId(eventRunId: string | undefined, activeRunId: string | null) {
  return Boolean(eventRunId && activeRunId && eventRunId !== activeRunId)
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
