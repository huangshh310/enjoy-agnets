/**
 * ACP 首轮提示与进程身份。切引擎必须换进程，摘要走隐藏上下文。
 */
import type { ModelMessage } from "ai"

export const HANDOFF_PREFIX = "[Engine handoff — hidden context, not a user message]"
export const CUSTOM_INSTRUCTIONS_PREFIX = "[Enjoy custom instructions]"

export function formatHandoffContext(input: {
  fromRuntimeId: string
  toRuntimeId: string
  summary: string
}): string {
  return [
    HANDOFF_PREFIX,
    `Previous engine: ${input.fromRuntimeId}`,
    `Next engine: ${input.toRuntimeId}`,
    "Summary:",
    input.summary.trim()
  ].join("\n")
}

/** 进程身份含 toolId，避免 Claude→Cursor 复用旧 ACP 假续跑。 */
export function acpProcessKey(
  toolId: string,
  modelId?: string,
  env?: Record<string, string>,
  mcpFingerprint?: string,
  pluginDirsKey?: string
): string {
  return `${toolId}:${modelId?.trim() || ""}:${JSON.stringify(env || {})}:${mcpFingerprint ?? ""}:${pluginDirsKey ?? ""}`
}

export function composeAcpPrompt(
  messages: ModelMessage[],
  extras?: { customInstructions?: string; skillCatalog?: string }
): string {
  const user = lastUserText(messages)
  const handoff = extractHandoffText(messages)
  const custom = extras?.customInstructions?.trim()
    ? `${CUSTOM_INSTRUCTIONS_PREFIX}\n${extras.customInstructions.trim()}`
    : ""
  const skills = extras?.skillCatalog?.trim() ?? ""
  return [custom, skills, handoff, user].filter(Boolean).join("\n\n---\n")
}

export function lastUserText(messages: ModelMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = userTextOf(messages[index])
    if (text) return text
  }
  return ""
}

function extractHandoffText(messages: ModelMessage[]): string {
  for (const message of messages) {
    if (message.role !== "system") continue
    const text = plainText(message)
    if (text.startsWith(HANDOFF_PREFIX)) return text
  }
  return ""
}

function userTextOf(message: ModelMessage | undefined): string {
  if (!message || message.role !== "user") return ""
  const text = plainText(message)
  const files = attachmentLines(message)
  if (text.trim() && files.length > 0) {
    return `${text}\n\nAttached workspace files:\n${files.join("\n")}`
  }
  if (text.trim()) return text
  if (files.length > 0) return `Attached workspace files:\n${files.join("\n")}`
  return ""
}

/** 只写工作区相对路径 / 文件名，不把二进制灌进 JSON-RPC。 */
function attachmentLines(message: ModelMessage): string[] {
  if (!Array.isArray(message.content)) return []
  const lines: string[] = []
  for (const part of message.content) {
    if (part.type !== "file" && part.type !== "image") continue
    const name = filePartName(part as unknown as Record<string, unknown>)
    if (!name) continue
    lines.push(`- ${name}`)
  }
  return lines
}

function filePartName(part: Record<string, unknown>): string {
  const raw =
    (typeof part.filename === "string" && part.filename) ||
    (typeof part.name === "string" && part.name) ||
    (typeof part.path === "string" && part.path) ||
    ""
  const name = raw.trim().replace(/\\/g, "/")
  if (!name || name.length > 400 || /[\n\r]/.test(name)) return ""
  return name
}

function plainText(message: ModelMessage): string {
  if (typeof message.content === "string") return message.content
  if (!Array.isArray(message.content)) return ""
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? String(part.text) : ""))
    .join("\n")
}

