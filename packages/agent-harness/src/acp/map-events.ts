/**
 * ACP session/update → Enjoy StreamEvent（可多条）。
 * 禁止 yield approval.required；审批只走 session/request_permission。
 * Task/Explore 归一成 delegate；无 parentToolCallId 时子工具保持平铺，禁止瞎编嵌套。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { isAcpPlanUpdate, mapAcpPlan } from "./map-acp-plan.ts"
import { mapAcpCommands, mapAcpToolEvents } from "./map-acp-tool.ts"
import { mapAcpUsageUpdate } from "./map-acp-usage.ts"
import { parseSessionConfigOptions, sessionConfigEvent } from "./parse-session-config.ts"

export function mapAcpUpdate(update: unknown, runId: string): StreamEvent[] {
  const rec = asRecord(update)
  const kind = String(rec.sessionUpdate ?? rec.type ?? "")
  if (kind === "agent_thought_chunk" || kind === "agent_thought") {
    const text = readContentText(rec.content ?? rec)
    return text ? [{ type: "reasoning.delta", runId, text }] : []
  }
  if (kind === "agent_message_chunk" || kind === "agent_message" || kind === "message") {
    const text = readContentText(rec.content ?? rec)
    return text ? [{ type: "text.delta", runId, text }] : []
  }
  if (kind === "tool_call" || kind === "tool_call_update") return mapAcpToolEvents(kind, rec, runId)
  if (isAcpPlanUpdate(kind)) return mapAcpPlan(rec, runId)
  if (kind === "session_info_update") {
    const title = typeof rec.title === "string" ? rec.title.trim() : ""
    return title ? [{ type: "session.title", runId, title }] : []
  }
  if (kind === "config_option_update") {
    const event = sessionConfigEvent(runId, parseSessionConfigOptions(rec))
    return event ? [event] : []
  }
  if (kind === "usage_update") return mapAcpUsageUpdate(rec, runId)
  if (kind === "available_commands_update") return mapAcpCommands(rec, runId)
  return []
}

function readContentText(value: unknown): string {
  if (typeof value === "string") return value
  const rec = asRecord(value)
  if (typeof rec.text === "string") return rec.text
  if (Array.isArray(rec.content)) {
    return rec.content.map((part) => readContentText(part)).join("")
  }
  return ""
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

