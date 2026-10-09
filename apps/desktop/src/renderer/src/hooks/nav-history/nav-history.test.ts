/**
 * 历史栈会失败的方式：前进栈没清、快速点击堆中间页、跳段只移一条、删当前页还留在栈里。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { HISTORY_COALESCE_MS, HISTORY_LIMIT } from "./constants.ts"
import { backHistory, forgetHistory, forwardHistory, jumpHistory, openHistory } from "./nav-history.ts"
import type { HistoryEntry, HistoryStack } from "./nav-history.types.ts"

function page(id: string): HistoryEntry {
  return { id, title: id, params: { kind: "route", to: "/" } }
}

function stack(current: string): HistoryStack {
  return {
    past: [],
    current: page(current),
    future: [],
    seeded: false,
    lastPushAt: null,
    lastAction: null
  }
}

function open(state: HistoryStack, id: string, now: number): HistoryStack {
  return openHistory(state, page(id), now)
}

test("A→B→C→D 后退到 B 再打开 E：C 和 D 不能再前进", () => {
  let state = stack("A")
  state = open(state, "A", 0)
  state = open(state, "B", 1000)
  state = open(state, "C", 2000)
  state = open(state, "D", 3000)
  state = backHistory(state)!
  state = backHistory(state)!
  state = open(state, "E", 4000)
  assert.deepEqual(state.past.map((entry) => entry.id), ["A", "B"])
  assert.equal(state.current.id, "E")
  assert.deepEqual(state.future, [])
})

test("再点当前页只更新标题，不入栈，也不清前进栈", () => {
  let state = open(open(stack("A"), "A", 0), "B", 1000)
  state = backHistory(state)!
  state = openHistory(state, { ...page("A"), title: "甲" }, 2000)
  assert.deepEqual(state.past.map((entry) => entry.id), [])
  assert.equal(state.current.title, "甲")
  assert.deepEqual(state.future.map((entry) => entry.id), ["B"])
})

test("past 或 future 为空时后退和前进都不动", () => {
  const seeded = open(stack("A"), "A", 0)
  assert.equal(backHistory(seeded), null)
  assert.equal(forwardHistory(seeded), null)
})

test("后退后再前进回到原来的页", () => {
  let state = open(open(stack("A"), "A", 0), "B", 1000)
  state = backHistory(state)!
  assert.equal(state.current.id, "A")
  state = forwardHistory(state)!
  assert.equal(state.current.id, "B")
  assert.deepEqual(state.future, [])
})

test("连续快速打开合并成一次 push", () => {
  let state = open(stack("A"), "A", 0)
  state = open(state, "B", 1000)
  state = open(state, "C", 1000 + HISTORY_COALESCE_MS - 1)
  state = open(state, "D", 1000 + HISTORY_COALESCE_MS + 10)
  assert.deepEqual(state.past.map((entry) => entry.id), ["A"])
  assert.equal(state.current.id, "D")
})

test("后退之后紧接着打开新页，仍把落点推进 past", () => {
  let state = open(open(open(stack("A"), "A", 0), "B", 1000), "C", 2000)
  state = backHistory(state)!
  state = open(state, "D", 2001)
  assert.deepEqual(state.past.map((entry) => entry.id), ["A", "B"])
  assert.equal(state.current.id, "D")
  assert.deepEqual(state.future, [])
})

test("past 和 future 超过 50 时丢掉最老的", () => {
  let state = open(stack("A"), "A", 0)
  for (let index = 1; index <= HISTORY_LIMIT + 1; index += 1) {
    state = open(state, String(index), index * 1000)
  }
  assert.equal(state.past.length, HISTORY_LIMIT)
  assert.equal(state.past[0]?.id, "1")
  assert.equal(state.current.id, String(HISTORY_LIMIT + 1))
  for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
    const next = backHistory(state)
    if (!next) break
    state = next
  }
  assert.equal(state.future.length, HISTORY_LIMIT)
  assert.equal(state.future.at(-1)?.id, state.past.length ? undefined : state.future.at(-1)?.id)
  assert.ok(state.future.length <= HISTORY_LIMIT)
})

test("后退跳过一段时，中间页整段进 future 末尾", () => {
  let state = stack("A")
  for (const id of ["A", "B", "C", "D", "E", "F"]) state = open(state, id, id.charCodeAt(0) * 1000)
  state = backHistory(state)!
  state = jumpHistory(state, "past", 2)!
  assert.deepEqual(state.past.map((entry) => entry.id), ["A", "B"])
  assert.equal(state.current.id, "C")
  assert.deepEqual(state.future.map((entry) => entry.id), ["F", "E", "D"])
})

test("前进跳过一段时，中间页整段进 past 末尾", () => {
  let state = stack("A")
  for (const id of ["A", "B", "C", "D", "E", "F"]) state = open(state, id, id.charCodeAt(0) * 1000)
  state = backHistory(state)!
  state = jumpHistory(state, "past", 2)!
  state = jumpHistory(state, "future", 2)!
  assert.deepEqual(state.past.map((entry) => entry.id), ["A", "B", "C", "D"])
  assert.equal(state.current.id, "E")
  assert.deepEqual(state.future.map((entry) => entry.id), ["F"])
})

test("删除非当前页只从两侧拿掉", () => {
  let state = open(open(open(stack("A"), "A", 0), "B", 1000), "C", 2000)
  const result = forgetHistory(state, new Set(["A"]), page("home"))
  assert.equal(result.removedCurrent, false)
  assert.deepEqual(result.stack.past.map((entry) => entry.id), ["B"])
  assert.equal(result.stack.current.id, "C")
})

test("删除当前页落到 past 末尾，栈里不再留被删页", () => {
  let state = open(open(open(stack("A"), "A", 0), "B", 1000), "C", 2000)
  state = backHistory(state)!
  const result = forgetHistory(state, new Set(["B"]), page("home"))
  assert.equal(result.removedCurrent, true)
  assert.equal(result.stack.current.id, "A")
  assert.deepEqual(result.stack.future.map((entry) => entry.id), ["C"])
  const ids = [...result.stack.past, result.stack.current, ...result.stack.future].map((entry) => entry.id)
  assert.equal(ids.includes("B"), false)
})

test("删除当前页且 past 为空时落到默认页", () => {
  const state = open(stack("A"), "A", 0)
  const result = forgetHistory(state, new Set(["A"]), page("home"))
  assert.equal(result.stack.current.id, "home")
  assert.deepEqual(result.stack.past, [])
  assert.deepEqual(result.stack.future, [])
})

test("越界跳转是空操作", () => {
  const state = open(open(stack("A"), "A", 0), "B", 1000)
  assert.equal(jumpHistory(state, "past", 5), null)
  assert.equal(jumpHistory(state, "future", 1), null)
})
