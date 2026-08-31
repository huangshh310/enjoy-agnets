/**
 * 把会话历史编成 AI SDK ModelMessage。
 * DeepSeek V4 在带 tools 时要求回传上一轮 reasoning。
 */
import type { ModelMessage } from "ai"

export type HistoryMessage = {
  role: string
  content: string
  reasoning?: string
}

export function toModelMessages(messages: HistoryMessage[]): ModelMessage[] {
  return messages.map((message) => {
    if (message.role === "assistant" && message.reasoning?.trim()) {
      return {
        role: "assistant",
        content: [
          { type: "reasoning", text: message.reasoning },
          { type: "text", text: message.content }
        ]
      } as ModelMessage
    }
    return {
      role: message.role,
      content: message.content
    } as ModelMessage
  })
}

/** 工具循环 / 审批续跑时，若 SDK 消息缺 reasoning part，用本轮累积补上。 */
export function ensureAssistantReasoning(
  messages: ModelMessage[],
  reasoning: string
): ModelMessage[] {
  const think = reasoning.trim()
  const last = messages.at(-1)
  if (!think || last?.role !== "assistant" || hasReasoningPart(last)) return messages

  const extra =
    typeof last.content === "string"
      ? [{ type: "text" as const, text: last.content }]
      : Array.isArray(last.content)
        ? last.content
        : []
  return [
    ...messages.slice(0, -1),
    { ...last, content: [{ type: "reasoning", text: think }, ...extra] } as ModelMessage
  ]
}

function hasReasoningPart(message: ModelMessage): boolean {
  return Array.isArray(message.content) && message.content.some((part) => part.type === "reasoning")
}
