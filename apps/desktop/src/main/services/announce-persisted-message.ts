/**
 * leo #147 MF-1：消息落库后把真实 id 回给 renderer（`message.persisted`）。
 * 走 stampAndBroadcast：过 StreamEvent 闸、打 sequence、进回放缓冲；没窗口也不抛。
 * 发送失败不影响落库（截断名单拿不到真 id 只会更保守：气泡当不存在 → 「有新内容」）。
 */
import { stampAndBroadcast } from "./event-bus"

type Announced = { runId: string; sessionId: string; messageId: string; role: "assistant" | "user" }
let testSink: ((event: Announced) => void) | null = null

/** 测试用：观察回报（不影响真发送）。 */
export function setPersistedMessageSinkForTest(sink: ((event: Announced) => void) | null): void {
  testSink = sink
}

export function announcePersistedMessage(input: Announced): void {
  testSink?.(input)
  try {
    stampAndBroadcast(
      {
        type: "message.persisted",
        runId: input.runId,
        sessionId: input.sessionId,
        messageId: input.messageId,
        role: input.role
      },
      input.sessionId
    )
  } catch (error) {
    console.warn("[persist] announce message id failed", { runId: input.runId, error })
  }
}
