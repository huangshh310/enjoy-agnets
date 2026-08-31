/**
 * 桌面端再导出 agent-core 流映射；补 toolCallId 回落。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

export { mapStreamPart } from "../../../../../packages/agent-core/src/streams/map-part.ts"

export function withToolId(event: StreamEvent, fallbackId: string): StreamEvent {
  if (!("toolCallId" in event) || event.toolCallId) return event
  return { ...event, toolCallId: fallbackId }
}
