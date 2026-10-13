/**
 * leo #145 S1：超时走 keepRunning（会话里别的轮还在跑，只有 pending 助手）时，不能删这次新建的会话。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const deleted: string[] = []
;(globalThis as { window?: unknown }).window = {
  ide: { session: { delete: async ({ sessionId }: { sessionId: string }) => void deleted.push(sessionId) } }
}
const { useChatStore } = await import("../../stores/chat-store.ts")
const { failComposerSend } = await import("./fail-composer-send.ts")

function seedPendingOnly(sessionId: string) {
  useChatStore.setState({
    sessionId,
    running: true,
    messages: [{ id: "msg_pending_1", role: "assistant", content: "", createdAt: 1, streaming: true }]
  })
}

test("keepRunning：新建会话里只有 pending 助手 → 不删会话、不清前台", async () => {
  seedPendingOnly("ses_keep")
  failComposerSend({ text: "hi", reason: "timeout", sessionId: "ses_keep", createdSessionId: "ses_keep", keepRunning: true })
  await new Promise((r) => setTimeout(r, 5))
  assert.deepEqual(deleted, [])
  assert.equal(useChatStore.getState().sessionId, "ses_keep")
  assert.equal(useChatStore.getState().messages.length, 1)
})

test("非 keepRunning 的空新会话仍会删（原行为不变）", async () => {
  seedPendingOnly("ses_drop")
  failComposerSend({ text: "hi", reason: "boom", sessionId: "ses_drop", createdSessionId: "ses_drop" })
  await new Promise((r) => setTimeout(r, 5))
  assert.deepEqual(deleted, ["ses_drop"])
})
