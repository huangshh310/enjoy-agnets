/**
 * 将会话线程转成与 main `toModelMessages` 同构的载荷预览。
 * 不伪造 system 指令，不把待发送芯片写进历史 user 行。
 */
import { estimateCharTokens } from "./context-token-estimator.ts"

export type RawThreadMessage = {
  index: number
  role: "user" | "assistant"
  content: string | Array<{ type: "reasoning" | "text"; text: string }>
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
    const role = message.role === "assistant" ? "assistant" : "user"
    return {
      index,
      role,
      content: message.content,
      rawText: message.content,
      tokens: estimateCharTokens(message.content.length)
    }
  })
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
