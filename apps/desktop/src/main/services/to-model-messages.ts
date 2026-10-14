/**
 * 把会话历史编成 AI SDK ModelMessage。
 * DeepSeek V4 在带 tools 时要求回传上一轮 reasoning。
 */
import { pruneMessages, type ModelMessage } from "ai"

/**
 * 只带附件、没打字的用户轮（#155 leo MUST 1）：正文为空会被 pruneMessages({emptyMessages:"remove"}) 整条删掉，
 * 本轮的附件随后找不到最后一条用户句、静默丢失；历史里的只图轮也会消失、助手轮连在一起。
 * 用固定占位把这条用户句留住；appendRunAttachments 编附件时把占位换掉（不发空 text part）。
 * leo（#155 @6d7ce465）：判定靠「这条确实带附件」（hasAttachments）+ 消息上的标记，不靠比字符串：
 * 用户真打了 "[attachment]" 不会被吞；真空、没附件的历史句照旧剪掉，不会冒充占位发出去。
 */
export const ATTACHMENT_ONLY_USER_TEXT = "[attachment]"

const PLACEHOLDER_MARK = "enjoyAttachmentOnly"

/** 这条是 toModelMessages 为只图轮垫的占位（看标记，不看正文）。 */
export function isAttachmentOnlyPlaceholder(message: ModelMessage | undefined): boolean {
  const options = (message as { providerOptions?: Record<string, Record<string, unknown>> } | undefined)?.providerOptions
  return options?.[PLACEHOLDER_MARK]?.placeholder === true
}

/** 去掉占位标记（真发给模型的消息不带内部标记）。 */
export function stripAttachmentOnlyMark<T extends ModelMessage>(message: T): T {
  const options = (message as { providerOptions?: Record<string, unknown> }).providerOptions
  if (!options || !(PLACEHOLDER_MARK in options)) return message
  const { [PLACEHOLDER_MARK]: _mark, ...rest } = options
  const next: Record<string, unknown> = { ...message }
  if (Object.keys(rest).length > 0) next.providerOptions = rest
  else delete next.providerOptions
  return next as T
}

export type HistoryMessage = {
  role: string
  content: string
  reasoning?: string
  /** 这条用户句带附件（库里有 file part，或本轮 attachments）。只有它才能用占位保住空正文。 */
  hasAttachments?: boolean
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
    if (message.role === "user" && !message.content.trim() && message.hasAttachments) {
      return {
        role: "user",
        content: ATTACHMENT_ONLY_USER_TEXT,
        providerOptions: { [PLACEHOLDER_MARK]: { placeholder: true } }
      } as ModelMessage
    }
    return {
      role: message.role,
      content: message.content
    } as ModelMessage
  })
  const pruned = pruneMessages({
    messages: clipConverted(converted),
    reasoning: "before-last-message",
    emptyMessages: "remove"
  })
  // 标记只留在最后一条（appendRunAttachments 要认它）；历史里的占位去标记再发。
  return pruned.map((message, index) => (index === pruned.length - 1 ? message : stripAttachmentOnlyMark(message)))
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
