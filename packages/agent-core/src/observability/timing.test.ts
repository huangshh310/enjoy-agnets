import assert from "node:assert/strict"
import { test } from "node:test"
import { markFirstVisible, tokensPerSecond, ttfoMs } from "./timing.ts"

test("ttfoMs 是首 token 相对 startedAt 的毫秒", () => {
  assert.equal(ttfoMs(1000, 1180), 180)
  assert.equal(ttfoMs(1000), undefined)
  assert.equal(ttfoMs(1000, 900), undefined)
})

test("tokensPerSecond 用输出 token 除以秒", () => {
  assert.equal(tokensPerSecond(20, 2000), 10)
  assert.equal(tokensPerSecond(0, 2000), undefined)
  assert.equal(tokensPerSecond(10, 0), undefined)
})

test("markFirstVisible 只记第一次", () => {
  const first = markFirstVisible(50)
  assert.equal(markFirstVisible(80, first), 50)
})
