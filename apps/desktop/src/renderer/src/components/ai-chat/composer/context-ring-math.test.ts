/**
 * 上下文环：缺数据不画，满了封顶，颜色分界固定。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { contextRingRatio, contextRingTone } from "./context-ring-math.ts"

test("没有窗口或没有用量时不画", () => {
  assert.equal(contextRingRatio(10, 0), null)
  assert.equal(contextRingRatio(0, 1000), null)
  assert.equal(contextRingRatio(Number.NaN, 1000), null)
})

test("用量超过窗口时封顶为 1", () => {
  assert.equal(contextRingRatio(1500, 1000), 1)
  assert.equal(contextRingRatio(250, 1000), 0.25)
})

test("0.75 起琥珀，0.9 起红", () => {
  assert.equal(contextRingTone(0.74), "tertiary")
  assert.equal(contextRingTone(0.75), "amber")
  assert.equal(contextRingTone(0.9), "red")
})
