/**
 * 出站 StreamEvent 闸：非法形状丢掉，开发态打一条日志。
 */
import {
  StreamEvent,
  type StreamEvent as StreamEventType
} from "../../../../../packages/ipc-contract/src/stream-event.ts"

export function acceptStreamEvent(event: unknown): StreamEventType | null {
  const parsed = StreamEvent.safeParse(event)
  if (parsed.success) return parsed.data
  if (process.env.NODE_ENV !== "production") {
    const type =
      event && typeof event === "object" && "type" in event
        ? String((event as { type?: unknown }).type)
        : "?"
    console.warn(`[stream] drop invalid StreamEvent type=${type}`)
  }
  return null
}
