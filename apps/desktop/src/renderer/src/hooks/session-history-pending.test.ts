import assert from "node:assert/strict"
import { test } from "node:test"
import {
  forgetSessionHistoryHydrated,
  isForegroundSessionPicking,
  isSessionHistoryHydrated,
  markSessionHistoryHydrated,
  sessionHistoryPending,
  setForegroundSessionPicking,
  subscribeSessionHistory
} from "./session-history-pending.ts"

const base = { sessionId: "s1", messageCount: 0, running: false, hydrated: false, timedOut: false }

test("选中会话、历史还没回灌：算加载中，不画空态", () => {
  assert.equal(sessionHistoryPending(base), true)
})

test("回灌完、有消息、在跑、没会话、等超时：都不算加载中（超时后回到空态）", () => {
  assert.equal(sessionHistoryPending({ ...base, hydrated: true }), false)
  assert.equal(sessionHistoryPending({ ...base, messageCount: 2 }), false)
  assert.equal(sessionHistoryPending({ ...base, running: true }), false)
  assert.equal(sessionHistoryPending({ ...base, sessionId: null }), false)
  assert.equal(sessionHistoryPending({ ...base, timedOut: true }), false)
})

test("工作区挑前台会话期间（还没 sessionId）也算加载中；没在挑、或超时就照常空态", () => {
  assert.equal(sessionHistoryPending({ ...base, sessionId: null, picking: true }), true)
  assert.equal(sessionHistoryPending({ ...base, sessionId: null, picking: false }), false)
  assert.equal(sessionHistoryPending({ ...base, sessionId: null, picking: true, timedOut: true }), false)
  assert.equal(sessionHistoryPending({ ...base, sessionId: null, picking: true, messageCount: 1 }), false)
})

test("打标 / 作废 / picking 都通知订阅者，状态随之变化", () => {
  let calls = 0
  const off = subscribeSessionHistory(() => {
    calls += 1
  })
  markSessionHistoryHydrated("s-mark")
  assert.equal(isSessionHistoryHydrated("s-mark"), true)
  markSessionHistoryHydrated("s-mark")
  assert.equal(calls, 1, "重复打标不重复通知")
  forgetSessionHistoryHydrated("s-mark")
  assert.equal(isSessionHistoryHydrated("s-mark"), false)
  assert.equal(calls, 2)
  setForegroundSessionPicking(true)
  assert.equal(isForegroundSessionPicking(), true)
  setForegroundSessionPicking(false)
  assert.equal(isForegroundSessionPicking(), false)
  assert.equal(calls, 4)
  off()
  markSessionHistoryHydrated("s-after-off")
  assert.equal(calls, 4)
})

test("A→B→A：切回 A 时旧的回灌标记作废，要等这次回灌；同会话重设、新建窗发布不作废", async () => {
  const { useChatStore } = await import("../stores/chat-store.ts")
  useChatStore.setState({ sessionId: null })
  markSessionHistoryHydrated("ses_new", { beforeOpen: true })
  useChatStore.getState().setSession("ses_new", "新对话")
  assert.equal(isSessionHistoryHydrated("ses_new"), true, "从无会话发布新建会话（先打过标）不清标记")

  markSessionHistoryHydrated("ses_a")
  useChatStore.getState().setSession("ses_a", "A")
  assert.equal(isSessionHistoryHydrated("ses_a"), false, "从 ses_new 切到 A：A 要重新回灌")
  markSessionHistoryHydrated("ses_a")
  useChatStore.getState().setSession("ses_a", "A 改名")
  assert.equal(isSessionHistoryHydrated("ses_a"), true, "同会话重设不作废")
  markSessionHistoryHydrated("ses_b")
  useChatStore.getState().setSession("ses_b", "B")
  useChatStore.getState().setSession("ses_a", "A")
  assert.equal(isSessionHistoryHydrated("ses_a"), false, "A→B→A：切回 A 等本次回灌")
})

test("A→空首页 / 创建窗→A：切回 A 也要等这次回灌，不先闪空态（leo #157 复审）", async () => {
  const { useChatStore } = await import("../stores/chat-store.ts")
  useChatStore.setState({ sessionId: null })
  useChatStore.getState().setSession("ses_home_a", "A")
  markSessionHistoryHydrated("ses_home_a")
  // 去空首页（show-empty-chat）或创建窗（detachComposerForCreate）：sessionId 直接写成 null。
  useChatStore.setState({ sessionId: null })
  useChatStore.getState().setSession("ses_home_a", "A")
  assert.equal(isSessionHistoryHydrated("ses_home_a"), false)
})

test("先打标的新建会话只保留一次：之后离开再回来照样要等回灌", async () => {
  const { useChatStore } = await import("../stores/chat-store.ts")
  useChatStore.setState({ sessionId: null })
  markSessionHistoryHydrated("ses_fresh", { beforeOpen: true })
  useChatStore.getState().setSession("ses_fresh", "新对话")
  assert.equal(isSessionHistoryHydrated("ses_fresh"), true)
  useChatStore.setState({ sessionId: null })
  useChatStore.getState().setSession("ses_fresh", "新对话")
  assert.equal(isSessionHistoryHydrated("ses_fresh"), false)
})
