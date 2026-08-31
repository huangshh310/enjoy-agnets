/**
 * 按 run 递增 sequence，给 StreamEvent 打时间戳。
 */
import { stampStreamEvent, type StreamEvent } from "@enjoy-agents/ipc-contract"

export function createEventStamper(sessionId: string) {
  let sequence = 0
  return function stamp<T extends StreamEvent>(event: T): T {
    sequence += 1
    return stampStreamEvent(event, { sequence, sessionId }) as T
  }
}
