/**
 * 生图表面用的上一轮用户 prompt，以及当前 Composer 是否在跑 imagine。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { composerRunKind, type ComposerRunKind } from "./composer-run-kind"

export function usePrecedingUserPrompt(messageId: string) {
  return useChatStore((state) => {
    const index = state.messages.findIndex((message) => message.id === messageId)
    const previous = index > 0 ? state.messages[index - 1] : undefined
    return previous?.role === "user" ? previous.content : undefined
  })
}

export function useComposerRunKind(): ComposerRunKind {
  return useChatStore((state) =>
    composerRunKind(state.modelId, state.models.find((model) => model.id === state.modelId)?.capabilities)
  )
}

/** 助手回合对应的上一条用户消息 id（改到这里截断锚点）。 */
export function precedingUserMessageId(
  messages: Array<{ id: string; role: string }>,
  assistantMessageId: string
): string | null {
  const index = messages.findIndex((message) => message.id === assistantMessageId)
  if (index <= 0) return null
  const previous = messages[index - 1]
  return previous?.role === "user" ? previous.id : null
}

export function usePrecedingUserMessageId(assistantMessageId: string): string | null {
  return useChatStore((state) => precedingUserMessageId(state.messages, assistantMessageId))
}

