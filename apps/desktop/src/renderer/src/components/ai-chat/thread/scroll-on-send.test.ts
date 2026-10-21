/**
 * mike P3（#163 巡检 52）：发出一句后对话贴底。host #170：默认就滚，只有排队自动发出 / 重来打一次性「这次别滚」。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  dropSkipSendScroll,
  lastUserChanged,
  lastUserMessageId,
  markQueuedAutoSend,
  markQueueResumedByUser,
  resetSkipSendScrollForTest,
  runQueuedAutoSend,
  shouldScrollOnSend,
  skipNextSendScroll,
  SKIP_SCROLL_WINDOW_MS,
  takeSkipSendScroll
} from "./scroll-on-send.ts"

const no = () => false
const changed = (s: string, a: string | null, b: string) => [{ sessionId: s, lastUserId: a }, { sessionId: s, lastUserId: b }] as const

test("host #170 默认贴底：同一会话里最后一条用户消息换了就滚——用户的各种发送都不用登记", () => {
  resetSkipSendScrollForTest()
  // 普通发送 / 插话 / 动作 chip / 执行计划 / 斜杠命令 / 设计 · diff 评论插话：都只是「最后一条用户消息换了」。
  // （「再发一次」/ 重新生成沿用原来那条用户消息的 id，不在这条规则里，见 scroll-on-send.ts 头注释。）
  for (const [prev, next] of [changed("s1", "u1", "u2"), changed("s1", null, "u1")]) {
    assert.equal(shouldScrollOnSend(prev, next, () => takeSkipSendScroll("s1")), true)
  }
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u2" }, no), true)
})

test("host #170 反方向：排队自动发出 / 重来打了一次性「这次别滚」→ 不滚；记号用一次就没，下一句照常贴底", () => {
  resetSkipSendScrollForTest()
  const take = () => takeSkipSendScroll("s1")
  // 排队那条自己发出去。
  skipNextSendScroll("s1")
  assert.equal(shouldScrollOnSend(...changed("s1", "u1", "u2"), take), false)
  assert.equal(shouldScrollOnSend(...changed("s1", "u2", "u3"), take), true, "记号是一次性的：用户紧接着自己发的那句贴底")
  // 重来：最后一条用户消息退回更早的一条。
  skipNextSendScroll("s1")
  assert.equal(shouldScrollOnSend(...changed("s1", "u3", "u1"), take), false)
  assert.equal(shouldScrollOnSend(...changed("s1", "u1", "u4"), take), true)
})

test("记号：别的会话 / 过期不算；用户消息没换时不取记号（留给真正换了的那一次）", () => {
  resetSkipSendScrollForTest()
  skipNextSendScroll("s1", 1_000)
  assert.equal(takeSkipSendScroll("s2", 1_001), false)
  assert.equal(takeSkipSendScroll("s1", 1_001), false, "取过一次（哪怕不算）就清")
  skipNextSendScroll("s1", 1_000)
  assert.equal(takeSkipSendScroll("s1", 1_000 + SKIP_SCROLL_WINDOW_MS + 1), false)
  skipNextSendScroll("s1")
  let asked = false
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u1" }, () => (asked = true)), false)
  assert.equal(asked, false, "用户消息没换时不该把记号取走")
  assert.equal(takeSkipSendScroll("s1"), true)
})

test("leo soft（原 soft-2 反过来）：排队那条被拦下没发出去，撤掉自己的记号，不吞后面用户自己那一发；别人后来打的记号不动", () => {
  resetSkipSendScrollForTest()
  const blocked = skipNextSendScroll("s1")
  dropSkipSendScroll(blocked)
  assert.equal(shouldScrollOnSend(...changed("s1", "u1", "u2"), () => takeSkipSendScroll("s1")), true, "用户自己发的照常贴底")
  const old = skipNextSendScroll("s1")
  skipNextSendScroll("s1") // 后来的重来 / 下一条排队
  dropSkipSendScroll(old)
  assert.equal(takeSkipSendScroll("s1"), true, "后来的记号还在")
})

test("luna #170 r-luna ②：点了「继续」后排队自启发出的那一条照常贴底（不打记号）；只管一次、同会话、10 秒内", () => {
  resetSkipSendScrollForTest()
  const t0 = Date.now()
  const take = () => takeSkipSendScroll("s1", t0 + 5_000)
  // 没点继续：排队自启打「这次别滚」。
  assert.notEqual(markQueuedAutoSend("s1", t0 + 1_000), null)
  assert.equal(shouldScrollOnSend(...changed("s1", "u1", "u2"), take), false)
  // 点了继续：接着自启发的第一条贴底。
  markQueueResumedByUser("s1", t0 + 2_000)
  assert.equal(markQueuedAutoSend("s1", t0 + 2_100), null)
  assert.equal(shouldScrollOnSend(...changed("s1", "u2", "u3"), take), true)
  // 一次性：下一条排队自启（上一条跑完后）又不滚。
  assert.notEqual(markQueuedAutoSend("s1", t0 + 2_200), null)
  assert.equal(shouldScrollOnSend(...changed("s1", "u3", "u4"), take), false)
  // 别的会话 / 过期的「继续」不算。
  markQueueResumedByUser("s2", t0 + 3_000)
  assert.notEqual(markQueuedAutoSend("s1", t0 + 3_001), null)
  takeSkipSendScroll("s1")
  markQueueResumedByUser("s1", t0 + 4_000)
  assert.notEqual(markQueuedAutoSend("s1", t0 + 4_000 + SKIP_SCROLL_WINDOW_MS + 1), null)
})

test("runQueuedAutoSend：发出去了记号留给对话区取；没发出去（用户消息没换）撤掉自己的记号；点过「继续」压根不打", async () => {
  resetSkipSendScrollForTest()
  let last: string | null = "u1"
  await runQueuedAutoSend("s1", () => last, async () => void (last = "u2"))
  assert.equal(takeSkipSendScroll("s1"), true, "发出去了：记号还在，对话区取到 → 不滚")
  await runQueuedAutoSend("s1", () => last, async () => undefined)
  assert.equal(takeSkipSendScroll("s1"), false, "被拦下：记号撤了")
  await assert.rejects(runQueuedAutoSend("s1", () => last, async () => Promise.reject(new Error("boom"))))
  assert.equal(takeSkipSendScroll("s1"), false, "抛错也撤")
  markQueueResumedByUser("s1")
  await runQueuedAutoSend("s1", () => last, async () => void (last = "u3"))
  assert.equal(takeSkipSendScroll("s1"), false, "点了继续：没打记号 → 贴底")
})

test("助手出字 / 工具卡更新（用户消息没变）、切会话、清空都不滚", () => {
  assert.equal(lastUserChanged({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: "u1" }), false)
  assert.equal(lastUserChanged({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s2", lastUserId: "u9" }), false)
  assert.equal(lastUserChanged({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s1", lastUserId: null }), false)
  assert.equal(shouldScrollOnSend({ sessionId: "s1", lastUserId: "u1" }, { sessionId: "s2", lastUserId: "u9" }, no), false)
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

test("接线：对话里挂 ConversationScrollOnChange；只有排队自启和重来打「这次别滚」，用户发送入口不登记", async () => {
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8")
  const thread = read("../ai-chat-thread.tsx")
  assert.match(thread, /<ConversationScrollOnChange trigger=\{sendTick\} \/>/)
  assert.match(thread, /useSendScrollTick\(sessionId, lastUserMessageId\(visible\)\)/)
  assert.match(thread, /shouldScrollOnSend\(markRef\.current, next, \(\) => takeSkipSendScroll\(sessionId\)\)/)
  // 排队自启：发之前打记号；发完用户消息没换（被拦下）就撤自己那枚。
  // 用户刚点了「继续」时不打记号（luna #170 r-luna ②）；runQueuedAutoSend 的行为见上面和 hooks/queue-continue-scroll.behavior.test.ts。
  const autostart = read("../../../hooks/use-followup-autostart.ts")
  assert.match(autostart, /send: \(item\) =>\s+runQueuedAutoSend\(\s+item\.sessionId,\s+\(\) => lastUserMessageId\(useChatStore\.getState\(\)\.messages\),\s+\(\) => sendComposerMessage\(/)
  // 「继续」：先记「用户刚点了继续」，再解除暂停（解除会同步 kick 自启）。
  const pauseActions = read("../../../hooks/runtime-interact/followup-pause-actions.ts")
  assert.match(pauseActions, /markQueueResumedByUser\(sessionId\)\s+resumeFollowups\(sessionId\)/)
  // 重来：截断前打记号（一条用户消息都不剩时不打）。
  const rewind = read("../../../hooks/rewind-from-here.ts")
  assert.match(rewind, /if \(lastUserMessageId\(kept\)\) skipNextSendScroll\(sessionId\)\s+latest\.setMessages\(kept\)/)
  // 用户发送入口一律不碰这套记号（新入口也不会漏）。
  for (const rel of ["../../app-shell/chat/chat-composer.tsx", "./turns/queued-user-turn.tsx"]) {
    assert.doesNotMatch(read(rel), /scroll-on-send|markUserSend|skipNextSendScroll/, rel)
  }
  // 不靠外部 rg（CI 机器上没有）：自己走一遍 renderer 源码。
  const { readdirSync } = await import("node:fs")
  const root = new URL("../../../", import.meta.url)
  const sources = (readdirSync(root, { recursive: true }) as string[])
    .map((path) => path.split("\\").join("/"))
    .filter((path) => /\.tsx?$/.test(path) && !path.endsWith(".test.ts"))
  const callers = (pattern: RegExp) => sources.filter((path) => pattern.test(readFileSync(new URL(path, root), "utf8"))).sort()
  assert.deepEqual(callers(/skipNextSendScroll\(/), ["components/ai-chat/thread/scroll-on-send.ts", "hooks/rewind-from-here.ts"])
  assert.deepEqual(callers(/runQueuedAutoSend\(/), ["components/ai-chat/thread/scroll-on-send.ts", "hooks/use-followup-autostart.ts"])
  assert.deepEqual(callers(/markQueueResumedByUser\(/), ["components/ai-chat/thread/scroll-on-send.ts", "hooks/runtime-interact/followup-pause-actions.ts"])
  const ui = read("../../../../../../../../packages/ui/components/ai-elements/conversation.tsx")
  assert.match(ui, /export const ConversationScrollOnChange/)
  assert.match(ui, /if \(last\.current === trigger\) return;/)
})
