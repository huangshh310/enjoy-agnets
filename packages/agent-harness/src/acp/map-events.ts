/**
 * ACP session/update → Enjoy StreamEvent（可多条）。
 * 禁止 yield approval.required；审批只走 session/request_permission。
 * Task/Explore 归一成 delegate；无 parentToolCallId 时子工具保持平铺，禁止瞎编嵌套。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { extractAcpDiffs } from "./acp-diff.ts"
import { stampDelegateArgs } from "./stamp-delegate-args.ts"

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
    const events: StreamEvent[] = [toolStartEvent(runId, toolCallId, name, args, rec)]
    events.push(...fileEvents(rec, runId))
    return events
  }
  if (kind === "available_commands_update") {
    const rawCommands = Array.isArray(rec.availableCommands) ? rec.availableCommands : []
    const commands: Array<{ name: string; description?: string }> = []
    for (const item of rawCommands) {
      const row = asRecord(item)
      const name = String(row.name ?? "").trim()
      if (!name) continue
      const description = typeof row.description === "string" ? row.description : undefined
      commands.push(description ? { name, description } : { name })
    }
    return commands.length ? [{ type: "commands.update", runId, commands }] : []
  }
  if (kind === "tool_call_update") {
    const toolCallId = String(rec.toolCallId ?? rec.id ?? "tool")
    const name = inferToolName(rec)
    const args = extractToolArgs(rec)
    const status = String(rec.status ?? "")
    const events: StreamEvent[] = [toolStartEvent(runId, toolCallId, name, args, rec)]
    events.push(...fileEvents(rec, runId))
    if (status === "completed" || status === "failed") {
      events.push(
        toolResultEvent(runId, toolCallId, name, args, rec, status === "failed")
      )
    }
    return events
  }
  return []
}

const WEAK_TOOL_NAME = /^(tool|function|call|command|cmd|execute|exec)$/i

function inferToolName(rec: Record<string, unknown>): string {
  const kind = String(rec.kind ?? rec.toolKind ?? "").toLowerCase()
  if (/^(task|delegate|subagent)$/.test(kind)) return "delegate"
  if (kind === "read") return "read_file"
  if (kind === "edit" || kind === "write" || kind === "delete") return "edit_file"
  if (kind === "execute" || kind === "shell" || kind === "terminal" || kind === "bash") return "bash"
  if (kind === "search" || kind === "grep" || kind === "glob") return "grep"

  const title = String(rec.title ?? rec.name ?? "").trim()
  const fromTitle = classifyTitle(title)
  if (fromTitle) return fromTitle

  const input = asRecord(rec.rawInput ?? rec.input)
  const nested = asRecord(input.args ?? input.arguments ?? input.params)
  if (input.command || input.cmd || nested.command || nested.cmd || hasArgv(input) || hasArgv(nested)) {
    return "bash"
  }
  if (input.content || input.diff || input.patch || input.replacement || input.edits) return "edit_file"
  if (input.query || input.pattern || input.glob) return "grep"
  if (input.path || input.file_path || input.file || hasLocations(rec)) return "read_file"
  if (title && !WEAK_TOOL_NAME.test(title)) return title
  return "command"
}

function classifyTitle(title: string): string | null {
  if (!title || WEAK_TOOL_NAME.test(title)) return null
  if (/^(task|delegate|subagent)$/i.test(title)) return "delegate"
  if (/^(explore|scout)\b/i.test(title)) return "delegate"
  if (/^read\b/i.test(title)) return "read_file"
  if (/^(edit|write|create|delete|update|patch|strreplace)\b/i.test(title)) return "edit_file"
  if (/^(run|bash|shell|exec)\b/i.test(title)) return "bash"
  return null
}

function hasLocations(rec: Record<string, unknown>): boolean {
  return Array.isArray(rec.locations) && rec.locations.length > 0
}

function hasArgv(rec: Record<string, unknown>): boolean {
  return Array.isArray(rec.argv) && rec.argv.length > 0 && rec.argv.every((item) => typeof item === "string")
}

function extractToolArgs(rec: Record<string, unknown>): unknown {
  const input = rec.rawInput ?? rec.input
  const parsedInput = parseRecord(input) ?? {}
  const recInput = { ...parsedInput }
  const nested = parseRecord(recInput.args ?? recInput.arguments ?? recInput.params) ?? {}
  const path =
    pickPath(recInput) ??
    pickPath(nested) ??
    locationPath(rec.locations ?? rec.location) ??
    pathFromTitle(String(rec.title ?? rec.name ?? ""))
  if (path) recInput.path = path
  if (!hasArgv(recInput) && hasArgv(nested)) recInput.argv = nested.argv
  if (!recInput.command && !recInput.cmd) {
    const title = String(rec.title ?? "").trim()
    if (title && !WEAK_TOOL_NAME.test(title) && looksLikeShell(title)) recInput.command = title
    const nestedCmd = typeof nested.command === "string" ? nested.command : typeof nested.cmd === "string" ? nested.cmd : ""
    if (nestedCmd) recInput.command = nestedCmd
  }
  const diffs = extractAcpDiffs(rec.content ?? rec)
  if (diffs[0]) {
    if (!recInput.path) recInput.path = diffs[0].path
    if (!recInput.diff) recInput.diff = diffs[0].diff
  }
  stampDelegateArgs(rec, recInput, input)
  return Object.keys(recInput).length > 0 ? recInput : input
}

function parentToolCallIdOf(rec: Record<string, unknown>): string | undefined {
  const value = rec.parentToolCallId
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function toolStartEvent(
  runId: string,
  toolCallId: string,
  name: string,
  args: unknown,
  rec: Record<string, unknown>
): StreamEvent {
  const parentToolCallId = parentToolCallIdOf(rec)
  return parentToolCallId
    ? { type: "tool.start", runId, toolCallId, name, args, parentToolCallId }
    : { type: "tool.start", runId, toolCallId, name, args }
}

function toolResultEvent(
  runId: string,
  toolCallId: string,
  name: string,
  args: unknown,
  rec: Record<string, unknown>,
  failed: boolean
): StreamEvent {
  const parentToolCallId = parentToolCallIdOf(rec)
  return {
    type: "tool.result",
    runId,
    toolCallId,
    name,
    args,
    result: rec.rawOutput ?? rec.content ?? rec.output,
    error: failed ? stringify(rec.rawOutput ?? rec.content) : undefined,
    ...(parentToolCallId ? { parentToolCallId } : {})
  }
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === "string" && value.trim().startsWith("{") && value.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(value.trim())
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {}
  }
  return null
}

const PATH_KEYS = [
  "path",
  "file",
  "file_path",
  "filePath",
  "target_file",
  "targetFile",
  "relative_workspace_path",
  "uri",
  "absolutePath"
] as const

function pickPath(rec: Record<string, unknown>): string | null {
  for (const key of PATH_KEYS) {
    const value = rec[key]
    if (typeof value === "string" && looksLikeToolPath(value)) return normalizeAcpPath(value)
  }
  return null
}

function locationPath(locations: unknown): string | null {
  const items = Array.isArray(locations) ? locations : locations ? [locations] : []
  for (const item of items) {
    if (typeof item === "string" && looksLikeToolPath(item)) return normalizeAcpPath(item)
    const found = pickPath(asRecord(item))
    if (found) return found
  }
  return null
}

function pathFromTitle(title: string): string | null {
  const match = title.trim().match(/^(?:read|write|edit|create|update|delete)(?:\s+file)?\s+(\S+)/i)
  const path = match?.[1]?.trim() ?? ""
  return looksLikeToolPath(path) ? normalizeAcpPath(path) : null
}

function looksLikeToolPath(value: string): boolean {
  const text = value.trim()
  if (!text || text.length > 400 || /[\n\r]/.test(text)) return false
  if (/^(file|folder|directory|dir|path|command|cmd|tool|read|edit|write|bash|shell)$/i.test(text)) {
    return false
  }
  return text.includes("/") || text.includes("\\") || /\.[a-z0-9]{1,12}$/i.test(text)
}

function normalizeAcpPath(value: string): string {
  return value.trim().replace(/^file:\/\//, "").replace(/\\/g, "/")
}

function looksLikeShell(title: string): boolean {
  return /^(ls|cat|git|npm|pnpm|yarn|curl|cd|rm|cp|mv|python|node|cargo|make)\b/i.test(title)
}

function fileEvents(rec: Record<string, unknown>, runId: string): StreamEvent[] {
  const locations = Array.isArray(rec.locations) ? rec.locations : []
  const events: StreamEvent[] = []
  const seen = new Set<string>()
  for (const item of locations) {
    const path = locationPath(item) ?? (typeof item === "string" ? item : "")
    if (!looksLikeToolPath(path)) continue
    const normalized = normalizeAcpPath(path)
    if (seen.has(normalized)) continue
    seen.add(normalized)
    events.push({ type: "file.changed", runId, path: normalized, kind: "modified" })
  }
  for (const block of extractAcpDiffs(rec.content ?? rec)) {
    if (seen.has(block.path)) continue
    seen.add(block.path)
    events.push({ type: "file.changed", runId, path: block.path, kind: "modified" })
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
