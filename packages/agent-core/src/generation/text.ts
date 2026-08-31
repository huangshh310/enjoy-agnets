/**
 * 文本 / 补全：streamText + generateText。prompt 与 messages 二选一。
 */
import { generateText, streamText, type LanguageModel, type ModelMessage } from "ai"

export async function generatePlainText(options: {
  model: LanguageModel
  prompt?: string
  messages?: ModelMessage[]
  abortSignal?: AbortSignal
}): Promise<string> {
  const { text } = await generateText({
    model: options.model,
    abortSignal: options.abortSignal,
    ...promptOrMessages(options)
  })
  return text
}

export function streamPlainText(options: {
  model: LanguageModel
  prompt?: string
  messages?: ModelMessage[]
  abortSignal?: AbortSignal
}) {
  return streamText({
    model: options.model,
    abortSignal: options.abortSignal,
    ...promptOrMessages(options)
  })
}

function promptOrMessages(options: { prompt?: string; messages?: ModelMessage[] }) {
  if (options.messages && options.messages.length > 0) {
    return { messages: options.messages }
  }
  return { prompt: options.prompt ?? "" }
}
