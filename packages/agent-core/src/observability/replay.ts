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
}

/** IPC 回放只回 type / runId / 序号，不带 prompt 或工具参数。 */
export function summarizeReplayEvents(
  events: Array<ReplayEvent & { type: string; runId?: string }>
): ReplaySummary[] {
  return events.map((event) => ({
    type: event.type,
    runId: event.runId,
    sequence: event.sequence,
    timestamp: event.timestamp
  }))
}
