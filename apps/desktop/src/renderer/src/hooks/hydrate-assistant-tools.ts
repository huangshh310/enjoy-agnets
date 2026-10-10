/**
 * 冷启动回灌工具：信封优先，缺失则从 parts 补。
 * 按落库态封口：output-available 是完成，禁止当 pending 转圈。
 */
import { sealAbandonedTools, type ThreadToolCall, type ToolCallState } from "@enjoy-agents/ipc-contract"

const TOOL_STATES = new Set<ToolCallState>([
  "input-streaming",
  "input-available",
  "approval-requested",
  "output-available",
  "output-error",
  "output-denied"
])

export function hydrateAssistantTools(
  payloadTools: ThreadToolCall[] | undefined,
  parts: unknown[] | undefined,
  sealAbandoned: boolean
): ThreadToolCall[] | undefined {
  const fromPayload = (payloadTools ?? []).filter(Boolean)
  const tools = fromPayload.length > 0 ? fromPayload : toolsFromParts(parts)
  if (tools.length === 0) return fromPayload.length > 0 ? fromPayload : undefined
  const normalized = tools.map(normalizePersistedTool)
  return sealAbandoned ? sealAbandonedTools(normalized) : normalized
}

export function toolsFromParts(parts: unknown[] | undefined): ThreadToolCall[] {
  const tools: ThreadToolCall[] = []
  for (const part of parts ?? []) {
    if (!part || typeof part !== "object") continue
    const rec = part as Record<string, unknown>
    if (rec.type !== "tool") continue
    if (typeof rec.toolCallId !== "string" || typeof rec.name !== "string") continue
    tools.push({
      id: rec.toolCallId,
      name: rec.name,
      args: rec.args,
      result: rec.result,
      errorText: typeof rec.error === "string" ? rec.error : undefined,
      state: isToolCallState(rec.state) ? rec.state : inferMissingState(rec)
    })
  }
  return tools
}

function normalizePersistedTool(tool: ThreadToolCall): ThreadToolCall {
  if (tool.state === "output-available" || tool.state === "output-error" || tool.state === "output-denied") {
    return tool
  }
  // 落库已有结果、无错误：按完成封，重启不得当 pending。
  if (tool.result != null && !tool.errorText) {
    return { ...tool, state: "output-available" }
  }
  return tool
}

function inferMissingState(rec: Record<string, unknown>): ToolCallState {
  if (rec.result != null && rec.error == null) return "output-available"
  if (typeof rec.error === "string") return "output-error"
  return "input-available"
}

function isToolCallState(value: unknown): value is ToolCallState {
  return typeof value === "string" && TOOL_STATES.has(value as ToolCallState)
}
