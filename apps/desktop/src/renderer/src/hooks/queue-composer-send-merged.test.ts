/**
 * leo soft：还稿时框里已有后打的字 → 两条拼回 + SEND_FAILED_RESTORE_MERGED；框空 → 普通「没发出去」。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { useChatStore } = await import("../stores/chat-store.ts")
const { restoreComposerAfterFailedSend } = await import("./queue-composer-send.ts")
const { SEND_FAILED_RESTORE, SEND_FAILED_RESTORE_MERGED } = await import("./queue-composer-send-copy.ts")

test("框里有 B：拼成 B\\nA，提示是 MERGED", () => {
  useChatStore.setState({ composer: "B 后打的", error: null, running: true })
  restoreComposerAfterFailedSend("A 没发出去", SEND_FAILED_RESTORE)
  const s = useChatStore.getState()
  assert.equal(s.composer, "B 后打的\nA 没发出去")
  assert.equal(s.error, SEND_FAILED_RESTORE_MERGED)
  assert.equal(s.running, false)
})

test("框空：只还 A，普通「没发出去」", () => {
  useChatStore.setState({ composer: "", error: null })
  restoreComposerAfterFailedSend("A 没发出去", SEND_FAILED_RESTORE)
  assert.equal(useChatStore.getState().composer, "A 没发出去")
  assert.equal(useChatStore.getState().error, SEND_FAILED_RESTORE)
})

test("别的原因（如建会话超时）不改写成 MERGED", () => {
  useChatStore.setState({ composer: "B", error: null })
  restoreComposerAfterFailedSend("A", "SESSION_CREATE_TIMEOUT")
  assert.equal(useChatStore.getState().error, "SESSION_CREATE_TIMEOUT")
})
