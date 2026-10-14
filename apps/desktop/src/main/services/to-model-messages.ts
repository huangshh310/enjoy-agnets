/**
 * 把会话历史编成 AI SDK ModelMessage。
 * DeepSeek V4 在带 tools 时要求回传上一轮 reasoning。
 */
import { pruneMessages, type ModelMessage } from "ai"

/**
 * 只带附件、没打字的用户轮（#155 leo MUST 1）：正文为空会被 pruneMessages({emptyMessages:"remove"}) 整条删掉，
 * 本轮的附件随后找不到最后一条用户句、静默丢失；历史里的只图轮也会消失、助手轮连在一起。
 * 用固定占位把这条用户句留住；appendRunAttachments 编附件时把占位换掉（不发空 text part）。
 */
export const ATTACHMENT_ONLY_USER_TEXT = "[attachment]"

export type HistoryMessage = {
  role: string
  content: string
  reasoning?: string
}

export function toModelMessages(messages: HistoryMessage[]): ModelMessage[] {
  const converted = messages.map((message) => {
    if (message.role === "assistant" && message.reasoning?.trim()) {
      return {
        role: "assistant",
        content: [
          { type: "reasoning", text: message.reasoning },
          { type: "text", text: message.content }
        ]
      } as ModelMessage
    }
    if (message.role === "user" && !message.content.trim()) {
      return { role: "user", content: ATTACHMENT_ONLY_USER_TEXT } as ModelMessage
    }
    return {
      role: message.role,
      content: message.content
    } as ModelMessage
  })
  return pruneMessages({
    messages: clipConverted(converted),
    reasoning: "before-last-message",
    emptyMessages: "remove"
  })
}

function clipConverted(messages: ModelMessage[], max = 40): ModelMessage[] {
  if (messages.length <= max) return messages
  const system = messages.filter((message) => message.role === "system")
  const rest = messages.filter((message) => message.role !== "system")
  return [...system, ...rest.slice(-Math.max(1, max - system.length))]
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
