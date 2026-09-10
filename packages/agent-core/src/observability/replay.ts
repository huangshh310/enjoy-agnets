/**
 * Stream replay：按 sequence 重放，缺序号时回落 timestamp。
 */
export type ReplayEvent = {
  sequence?: number
  timestamp?: number
}

export function orderReplayEvents<T extends ReplayEvent>(events: T[]): T[] {
  return [...events].sort((left, right) => {
    const seq = (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER)
    if (seq !== 0) return seq
    return (left.timestamp ?? 0) - (right.timestamp ?? 0)
  })
}

export type ReplaySummary = {
  type: string
  runId?: string
  sequence?: number
  timestamp?: number
  /** 仅工具/审批名，不含 args。 */
  toolName?: string
  decision?: string
}

const TRACE_TYPES = new Set([
  "run.start",
  "run.end",
  "run.error",
  "tool.start",
  "tool.result",
  "approval.required",
  "approval.resolved"
])

/** IPC 回放只回 type / runId / 序号，不带 prompt 或工具参数。 */
export function summarizeReplayEvents(events: readonly object[]): ReplaySummary[] {
  return events.map((item) => {
    const event = item as Record<string, unknown>
    return {
      type: String(event.type ?? ""),
      runId: typeof event.runId === "string" ? event.runId : undefined,
      sequence: typeof event.sequence === "number" ? event.sequence : undefined,
      timestamp: typeof event.timestamp === "number" ? event.timestamp : undefined,
      ...(typeof event.name === "string" ? { toolName: event.name } : {}),
      ...(typeof event.decision === "string" ? { decision: event.decision } : {})
    }
  })
}

/** Trace 树只用工具/审批生命周期，仍然不含 args。 */
export function summarizeTraceEvents(events: readonly object[]): ReplaySummary[] {
  return summarizeReplayEvents(events).filter((event) => TRACE_TYPES.has(event.type))
}
