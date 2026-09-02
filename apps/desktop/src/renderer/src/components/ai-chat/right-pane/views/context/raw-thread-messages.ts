/**
 * 检查器消息行：线程转译，或 main inspectPrompt 的 instructions + messages。
 */
import { estimateCharTokens } from "./context-token-estimator.ts"

export type RawThreadRole = "system" | "user" | "assistant"

export type RawThreadMessage = {
  index: number
  role: RawThreadRole
  content: unknown
  rawText: string
  tokens: number
}

export function threadToRawMessages(
  messages: Array<{ role: string; content: string; reasoning?: string }>
): RawThreadMessage[] {
  return messages.map((message, index) => {
    if (message.role === "assistant" && message.reasoning?.trim()) {
      return assistantWithReasoning(index, message.content, message.reasoning.trim())
    }
    return {
      index,
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
      rawText: message.content,
      tokens: estimateCharTokens(message.content.length)
    }
  })
}

export function inspectToRawMessages(
  instructions: string,
  messages: Array<{ role: string; content: unknown }>
): RawThreadMessage[] {
  const rows: RawThreadMessage[] = []
  if (instructions.trim()) {
    rows.push(textRow(0, "system", instructions))
  }
  for (const message of messages) {
    rows.push({
      index: rows.length,
      role: roleOf(message.role),
      content: message.content,
      rawText: rawTextOf(message.content),
      tokens: estimateCharTokens(rawTextOf(message.content).length)
    })
  }
  return rows
}

function assistantWithReasoning(index: number, content: string, think: string): RawThreadMessage {
  const rawText = `${think}\n\n${content}`
  return {
    index,
    role: "assistant",
    content: [
      { type: "reasoning", text: think },
      { type: "text", text: content }
    ],
    rawText,
    tokens: estimateCharTokens(rawText.length)
  }
}

function textRow(index: number, role: RawThreadRole, text: string): RawThreadMessage {
  return { index, role, content: text, rawText: text, tokens: estimateCharTokens(text.length) }
}

function roleOf(role: string): RawThreadRole {
  if (role === "system" || role === "assistant") return role
  return "user"
}

function rawTextOf(content: unknown): string {
  if (typeof content === "string") return content
  try {
    return JSON.stringify(content, null, 2)
  } catch {
    return ""
  }
}
