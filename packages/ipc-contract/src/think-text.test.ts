import assert from "node:assert/strict"
import { test } from "node:test"
import { absorbTextDelta, clampThoughtSeconds } from "./think-text.ts"

test("splits complete think tags out of visible text", () => {
  const next = absorbTextDelta({ visible: "", think: "", pendingThink: false }, "<think>先看一眼</think>你好")
  assert.equal(next.visible, "你好")
  assert.equal(next.think, "先看一眼")
  assert.equal(next.pendingThink, false)
})

test("holds an unclosed think block across deltas", () => {
  const mid = absorbTextDelta({ visible: "", think: "", pendingThink: false }, "<think>正在")
  assert.equal(mid.visible, "")
  assert.equal(mid.think, "正在")
  assert.equal(mid.pendingThink, true)
  const done = absorbTextDelta(mid, "想</think>回答")
  assert.equal(done.visible, "回答")
  assert.equal(done.think, "正在想")
  assert.equal(done.pendingThink, false)
})

test("clampThoughtSeconds hides stale hour-long clocks", () => {
  assert.equal(clampThoughtSeconds(1000, 2500), 2)
  assert.equal(clampThoughtSeconds(1000, 1000 + 181_000), null)
})
