/**
 * mike P3（#163 巡检 52）：发出一句后对话贴底。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  lastUserChanged,
  lastUserMessageId,
  markUserSend,
  shouldScrollOnSend,
  takeUserSend,
  USER_SEND_WINDOW_MS,
  userSendQueues
} from "./scroll-on-send.ts"

const yes = () => true

test("scroll-on-send：同一会话里最后一条用户消息换了、且是用户自己点的发送 → 滚到底", () => {
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u2" }, yes), true)
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: null }, { sessionId: "s1", lastUserId: "u1" }, yes), true)
})

test("leo soft-2：排队那条自己发出去 / 重来改了最后一条（没有用户点发送）→ 不滚，留在用户翻到的位置", () => {
  takeUserSend("s1") // 清掉别的用例留下的记号
  // 排队自动发出：最后一条用户消息换了，但没人点发送。
  assert.equal(
    shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u2" }, () => takeUserSend("s1")),
    false
  )
  // 重来：最后一条用户消息退回更早的一条，同样没人点发送。
  assert.equal(
    shouldScrollOnSend({ sessionId: "s1", lastUserId: "u3" }, { sessionId: "s1", lastUserId: "u1" }, () => takeUserSend("s1")),
    false
  )
  // 用户点了发送：贴底；记号取一次就清，之后排队自己发出去的那条不跟着贴底。
  markUserSend("s1")
  const next = () => takeUserSend("s1")
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u2" }, next), true)
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u2" }, { sessionId: "s1", lastUserId: "u3" }, next), false)
})

test("记号：过期 / 别的会话不算；新对话点发送时还没有会话也算；用户消息没换不取记号", () => {
  markUserSend("s1", 1_000)
  assert.equal(takeUserSend("s1", 1_000 + USER_SEND_WINDOW_MS + 1), false)
  markUserSend("s1", 1_000)
  assert.equal(takeUserSend("s2", 1_001), false)
  markUserSend(null, 1_000)
  assert.equal(takeUserSend("s-new", 1_500), true)
  markUserSend("s1")
  let asked = false
  assert.equal(
    shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u1" }, () => (asked = true)),
    false
  )
  assert.equal(asked, false, "用户消息没换时不该把记号取走")
  assert.equal(takeUserSend("s1"), true)
})

test("跑着时按 Enter 是排队，不记「刚点了发送」；插话（steer）和没在跑时的发送都记", () => {
  assert.equal(userSendQueues(true, "send"), true)
  assert.equal(userSendQueues(true, "steer"), false)
  assert.equal(userSendQueues(false, "send"), false)
  assert.equal(userSendQueues(false, "steer"), false)
})

test("助手出字 / 工具卡更新（用户消息没变）、切会话、清空都不滚", () => {
  assert.equal(lastUserChanged({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u1" }), false)
  assert.equal(lastUserChanged({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s2", lastUserId: "u9" }), false)
  assert.equal(lastUserChanged({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: null }), false)
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s2", lastUserId: "u9" }, yes), false)
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
  assert.match(thread, /shouldScrollOnSend\(markRef\.current, next, \(\) => takeUserSend\(sessionId\)\)/)
  // 记号只在用户自己点发送的地方记：输入框发送 / 插话、排队行「立即发送 / 马上发给它」；排队自动发出那条路不记。
  const composer = readFileSync(new URL("../../app-shell/chat/chat-composer.tsx", import.meta.url), "utf8")
  assert.match(composer, /noteUserSend\("send"\)\s+onSend\(\)/)
  assert.match(composer, /noteUserSend\("steer"\)\s+void submitComposer\("steer"\)/)
  const row = readFileSync(new URL("./turns/queued-user-turn.tsx", import.meta.url), "utf8")
  assert.match(row, /markUserSend\(item\.sessionId\)[\s\S]{0,40}void sendFollowupNow\(item\)/)
  const autostart = readFileSync(new URL("../../../hooks/use-followup-autostart.ts", import.meta.url), "utf8")
  assert.doesNotMatch(autostart, /markUserSend/)
  const ui = readFileSync(new URL("../../../../../../../../packages/ui/components/ai-elements/conversation.tsx", import.meta.url), "utf8")
  assert.match(ui, /export const ConversationScrollOnChange/)
  assert.match(ui, /if \(last\.current === trigger\) return;/)
})
