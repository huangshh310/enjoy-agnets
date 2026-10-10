/**
 * 出站 StreamEvent 闸：非法形状丢掉，开发态全量日志，生产态限速计数。
 */
import {
  StreamEvent,
  type StreamEvent as StreamEventType
} from "../../../../../packages/ipc-contract/src/stream-event.ts"

const dropStats = new Map<string, { count: number; lastLogAt: number }>()
const PROD_LOG_EVERY_MS = 10_000

export function acceptStreamEvent(event: unknown): StreamEventType | null {
  const parsed = StreamEvent.safeParse(event)
  if (parsed.success) return parsed.data
  noteDroppedStreamEvent(event)
  return null
}

export function streamEventDropCount(type?: string): number {
  if (!type) {
    let total = 0
    for (const row of dropStats.values()) total += row.count
    return total
  }
  return dropStats.get(type)?.count ?? 0
}

export function resetStreamEventDropStats(): void {
  dropStats.clear()
}

function noteDroppedStreamEvent(event: unknown): void {
  const type =
    event && typeof event === "object" && "type" in event
      ? String((event as { type?: unknown }).type)
      : "?"
  const row = dropStats.get(type) ?? { count: 0, lastLogAt: 0 }
  row.count += 1
  const now = Date.now()
  const verbose = process.env.NODE_ENV !== "production"
  if (verbose || now - row.lastLogAt >= PROD_LOG_EVERY_MS) {
    console.warn(`[stream] drop invalid StreamEvent type=${type} count=${row.count}`)
    row.lastLogAt = now
  }
  dropStats.set(type, row)
}
