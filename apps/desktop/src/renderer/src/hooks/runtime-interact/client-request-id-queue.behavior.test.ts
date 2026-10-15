/**
 * leo soft（#136）：建会话窗排队首发，会话没建成（失败 / 取消）——clientRequestId 必须放掉，
 * 否则下一发沿用同一个 id，main 60s 内当重复吞掉。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { useChatStore } = await import("../../stores/chat-store.ts")
const { sendComposerMessage } = await import("./send-composer-run.ts")
const { beginNewSessionCreate, failNewSessionCreate, resetNewSessionCreateForTest } = await import("../new-session-create.ts")
const { resetQueuedComposerSendForTest } = await import("../queue-composer-send.ts")
const { peekClientRequestIdForTest, resetClientRequestIdForTest } = await import("./client-request-id.ts")

test("排队首发建会话失败：clientRequestId 放掉", async () => {
  resetNewSessionCreateForTest()
  resetQueuedComposerSendForTest()
  resetClientRequestIdForTest()
  useChatStore.setState({ sessionId: null, running: false, composer: "A", error: null, messages: [] } as never)
  const { token } = beginNewSessionCreate()
  const sending = sendComposerMessage(undefined, "A", { text: "A", launched: false, cancelled: false, done: false, paused: false } as never)
  assert.notEqual(peekClientRequestIdForTest(), null, "排队期间 id 挂着")
  failNewSessionCreate(token, new Error("boom"))
  await sending
  assert.equal(peekClientRequestIdForTest(), null)
})
