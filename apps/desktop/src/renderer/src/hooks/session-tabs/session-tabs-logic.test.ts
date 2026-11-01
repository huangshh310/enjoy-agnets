import assert from "node:assert/strict"
import { test } from "node:test"
import {
  SESSION_TAB_CAP,
  SESSION_TAB_OVERFLOW_MESSAGE,
  closeSessionTab,
  openSessionTab,
  planNewChatIntoTabs,
  removeSessionFromTabs,
  seedTabIfEmpty,
  selectSessionFromSidebar,
  tabCloseNeedsDraftConfirm
} from "./session-tabs-logic.ts"

test("⌘开标签：加入并聚焦；已在集内只聚焦", () => {
  const first = openSessionTab({ tabIds: ["b"] }, "a")
  assert.equal(first.ok, true)
  if (!first.ok) return
  assert.deepEqual(first.tabIds, ["b", "a"])
  assert.equal(first.focusId, "a")
  assert.equal(first.alreadyOpen, false)

  const again = openSessionTab({ tabIds: ["b", "a"] }, "a")
  assert.equal(again.ok, true)
  if (!again.ok) return
  assert.deepEqual(again.tabIds, ["b", "a"])
  assert.equal(again.alreadyOpen, true)
})

test("第 7 次开标签：人话拒绝，不暗默丢", () => {
  const six = ["1", "2", "3", "4", "5", "6"]
  const result = openSessionTab({ tabIds: six }, "7")
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.reason, "cap")
  assert.equal(result.message, SESSION_TAB_OVERFLOW_MESSAGE)
  assert.deepEqual(result.tabIds, six)
  assert.equal(SESSION_TAB_CAP, 6)
})

test("关标签不删会话：切下一枚；关到 0 → nextActive null", () => {
  const mid = closeSessionTab({ tabIds: ["a", "b", "c"] }, "b", "b")
  assert.deepEqual(mid.tabIds, ["a", "c"])
  assert.equal(mid.nextActive, "c")

  const last = closeSessionTab({ tabIds: ["a"] }, "a", "a")
  assert.deepEqual(last.tabIds, [])
  assert.equal(last.nextActive, null)
})

test("关非前台标签：前台不变", () => {
  const result = closeSessionTab({ tabIds: ["a", "b"] }, "b", "a")
  assert.deepEqual(result.tabIds, ["a"])
  assert.equal(result.nextActive, "a")
})

test("归档/删除会话：从标签集移除", () => {
  const result = removeSessionFromTabs({ tabIds: ["a", "b"] }, "a", "a")
  assert.deepEqual(result.tabIds, ["b"])
  assert.equal(result.nextActive, "b")
})

test("侧栏单击：已在集内选中；0 标签空态单击加入首枚；有集但不在其中不自动加入", () => {
  assert.deepEqual(selectSessionFromSidebar({ tabIds: ["a", "b"] }, "b"), {
    tabIds: ["a", "b"],
    focusId: "b",
    added: false
  })
  assert.deepEqual(selectSessionFromSidebar({ tabIds: [] }, "x"), {
    tabIds: ["x"],
    focusId: "x",
    added: true
  })
  assert.deepEqual(selectSessionFromSidebar({ tabIds: ["a"] }, "z"), {
    tabIds: ["a"],
    focusId: "z",
    added: false
  })
})

test("新对话：复用空标签 / 替换空新对话槽 / 否则新开", () => {
  const reused = planNewChatIntoTabs({
    tabIds: ["empty"],
    activeId: "empty",
    newSessionId: "empty",
    reusedEmpty: true,
    emptyNewChatTabId: "empty"
  })
  assert.equal(reused.replacedEmpty, true)
  assert.equal(reused.focusId, "empty")

  const replaceSlot = planNewChatIntoTabs({
    tabIds: ["old-empty", "b"],
    activeId: "b",
    newSessionId: "fresh",
    reusedEmpty: false,
    emptyNewChatTabId: "old-empty"
  })
  assert.deepEqual(replaceSlot.tabIds, ["fresh", "b"])
  assert.equal(replaceSlot.replacedEmpty, true)

  const openNew = planNewChatIntoTabs({
    tabIds: ["a"],
    activeId: "a",
    newSessionId: "n",
    reusedEmpty: false,
    emptyNewChatTabId: null
  })
  assert.deepEqual(openNew.tabIds, ["a", "n"])
})

test("关标签草稿确认：仅内存草稿弹；已落盘不弹", () => {
  assert.equal(
    tabCloseNeedsDraftConfirm({
      sessionId: "a",
      activeId: "a",
      composer: "还没发",
      persistedDraftText: undefined
    }),
    true
  )
  assert.equal(
    tabCloseNeedsDraftConfirm({
      sessionId: "a",
      activeId: "a",
      composer: "还没发",
      persistedDraftText: "已落盘"
    }),
    false
  )
  assert.equal(
    tabCloseNeedsDraftConfirm({
      sessionId: "b",
      activeId: "a",
      composer: "前台字",
      memoryDraftText: "后台内存",
      persistedDraftText: ""
    }),
    true
  )
  assert.equal(
    tabCloseNeedsDraftConfirm({
      sessionId: "b",
      activeId: "a",
      composer: "前台字",
      memoryDraftText: "",
      persistedDraftText: ""
    }),
    false
  )
})

test("启动种标签：有前台且工作集空 → 一枚；空态不种", () => {
  assert.deepEqual(seedTabIfEmpty([], "ses_1"), ["ses_1"])
  assert.deepEqual(seedTabIfEmpty(["a"], "ses_1"), ["a"])
  assert.deepEqual(seedTabIfEmpty([], null), [])
})
