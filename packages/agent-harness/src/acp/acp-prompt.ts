/**
 * ACP 首轮提示与进程身份。切引擎必须换进程，摘要走隐藏上下文。
 */
import type { ModelMessage } from "ai"

export const HANDOFF_PREFIX = "[Engine handoff — hidden context, not a user message]"

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
  env?: Record<string, string>
): string {
  return `${toolId}:${modelId?.trim() || ""}:${JSON.stringify(env || {})}`
}

export function composeAcpPrompt(messages: ModelMessage[]): string {
  const user = lastUserText(messages)
  const handoff = extractHandoffText(messages)
  if (!handoff) return user
  return `${handoff}\n\n---\n${user}`
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
  const hasFile = hasFilePart(message)
  if (text.trim() && hasFile) {
    return `${text}\n[User also attached files. They are not forwarded over the ACP text prompt.]`
  }
  if (text.trim()) return text
  if (hasFile) return "[User attached files. They are not forwarded over the ACP text prompt.]"
  return ""
}

function plainText(message: ModelMessage): string {
  if (typeof message.content === "string") return message.content
  if (!Array.isArray(message.content)) return ""
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? String(part.text) : ""))
    .join("\n")
}

function hasFilePart(message: ModelMessage): boolean {
  return (
    Array.isArray(message.content) &&
    message.content.some((part) => part.type === "file" || part.type === "image")
  )
}
