/**
 * ACP session/update → Enjoy StreamEvent（可多条）。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

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
  if (kind === "tool_call") {
    const toolCallId = String(rec.toolCallId ?? rec.id ?? "tool")
    const name = inferToolName(rec)
    const args = extractToolArgs(rec)
    const events: StreamEvent[] = [
      { type: "tool.start", runId, toolCallId, name, args }
    ]
    events.push(...fileEvents(rec, runId))
    return events
  }
  if (kind === "tool_call_update") {
    const toolCallId = String(rec.toolCallId ?? rec.id ?? "tool")
    const name = inferToolName(rec)
    const status = String(rec.status ?? "")
    const events: StreamEvent[] = []
    events.push(...fileEvents(rec, runId))
    if (status === "completed" || status === "failed") {
      events.push({
        type: "tool.result",
        runId,
        toolCallId,
        name,
        result: rec.rawOutput ?? rec.content ?? rec.output,
        error: status === "failed" ? stringify(rec.rawOutput ?? rec.content) : undefined
      })
    }
    return events
  }
  return []
}

function inferToolName(rec: Record<string, unknown>): string {
  const raw = String(rec.title ?? rec.name ?? rec.kind ?? "").trim()
  if (raw && raw !== "tool" && raw !== "function" && raw !== "call") {
    return raw
  }
  const input = asRecord(rec.rawInput ?? rec.input)
  if (input.command || input.cmd) return "bash"
  if (input.content || input.diff || input.patch || input.replacement || input.edits) return "edit_file"
  if (Array.isArray(rec.locations) && rec.locations.length > 0) return "edit_file"
  if (input.query || input.pattern || input.glob) return "grep"
  if (input.path || input.file_path || input.file) return "read_file"
  return raw || "command"
}

function extractToolArgs(rec: Record<string, unknown>): unknown {
  const input = rec.rawInput ?? rec.input
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const recInput = { ...(input as Record<string, unknown>) }
    if (!recInput.path && !recInput.file && Array.isArray(rec.locations) && rec.locations[0]) {
      const locPath = asRecord(rec.locations[0]).path
      if (typeof locPath === "string" && locPath) {
        recInput.path = locPath
      }
    }
    return recInput
  }
  if (Array.isArray(rec.locations) && rec.locations[0]) {
    const locPath = asRecord(rec.locations[0]).path
    if (typeof locPath === "string" && locPath) {
      return { path: locPath }
    }
  }
  return input
}

function fileEvents(rec: Record<string, unknown>, runId: string): StreamEvent[] {
  const locations = Array.isArray(rec.locations) ? rec.locations : []
  const events: StreamEvent[] = []
  for (const item of locations) {
    const path = String(asRecord(item).path ?? "")
    if (!path) continue
    events.push({ type: "file.changed", runId, path, kind: "modified" })
  }
  return events
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

function stringify(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
