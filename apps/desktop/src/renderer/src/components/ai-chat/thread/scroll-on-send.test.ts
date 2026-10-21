/**
 * mike P3（#163 巡检 52）：发出一句后对话贴底。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { lastUserMessageId, shouldScrollOnSend } from "./scroll-on-send.ts"

test("scroll-on-send：同一会话里最后一条用户消息换了 → 滚到底", () => {
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u2" }), true)
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: null }, { sessionId: "s1", lastUserId: "u1" }), true)
})

test("助手出字 / 工具卡更新（用户消息没变）、切会话、清空都不滚", () => {
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u1" }), false)
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s2", lastUserId: "u9" }), false)
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: null }), false)
})

test("lastUserMessageId 取最后一条用户消息", () => {
  assert.equal(
    lastUserMessageId([
      { id: "u1", role: "user" },
      { id: "a1", role: "assistant" },
      { id: "u2", role: "user" },
      { id: "a2", role: "assistant" }
    ]),
    "u2"
  )
  assert.equal(lastUserMessageId([{ id: "a1", role: "assistant" }]), null)
})

test("接线：对话里挂 ConversationScrollOnChange，ui 包里它在 trigger 变化时 scrollToBottom（首帧不滚）", () => {
  const thread = readFileSync(new URL("../ai-chat-thread.tsx", import.meta.url), "utf8")
  assert.match(thread, /<ConversationScrollOnChange trigger=\{sendTick\} \/>/)
  assert.match(thread, /useSendScrollTick\(sessionId, lastUserMessageId\(visible\)\)/)
  const ui = readFileSync(new URL("../../../../../../../../packages/ui/components/ai-elements/conversation.tsx", import.meta.url), "utf8")
  assert.match(ui, /export const ConversationScrollOnChange/)
  assert.match(ui, /if \(last\.current === trigger\) return;/)
})
