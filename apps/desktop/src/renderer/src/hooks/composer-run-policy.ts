/**
 * Composer 运行策略：Stop 不依赖 runId；IPC 返回后按会话认领。
 */
import type { ThreadMessage } from "../stores/chat-store.types"

/** 用户已 Stop 或切了会话时，禁止把后到的 runId 重新写成 running。 */
export function canClaimComposerRun(input: {
  running: boolean
  sessionId: string | null
  startedSessionId: string | null
}): boolean {
  return input.running && input.sessionId === input.startedSessionId
}

/** 空的流式助手轮（只有 Thinking 壳）Stop 时直接丢掉。 */
export function isEmptyStreamingAssistant(message: ThreadMessage | undefined): boolean {
  if (!message || message.role !== "assistant" || !message.streaming) return false
  return (
    !message.content.trim() &&
    !(message.reasoning ?? "").trim() &&
    !message.tools?.length &&
    !message.assets?.length
  )
}
