import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldAutoCompact } from "./should-compact.ts"

test("消息太少不压缩", () => {
  assert.equal(
    shouldAutoCompact({ messageCount: 4, estimatedTokens: 9_000, contextWindow: 8_000 }),
    false
  )
})

test("未到条数地板时，达到窗口 70% 才压", () => {
  assert.equal(
    shouldAutoCompact({ messageCount: 8, estimatedTokens: 6_000, contextWindow: 10_000 }),
    false
  )
  assert.equal(
    shouldAutoCompact({ messageCount: 8, estimatedTokens: 7_000, contextWindow: 10_000 }),
    true
  )
})

test("有窗口时消息 ≥16 条也压", () => {
  assert.equal(
    shouldAutoCompact({ messageCount: 16, estimatedTokens: 100, contextWindow: 10_000 }),
    true
  )
})

test("没有窗口数字时按条数", () => {
  assert.equal(shouldAutoCompact({ messageCount: 15, estimatedTokens: 1 }), false)
  assert.equal(shouldAutoCompact({ messageCount: 16, estimatedTokens: 1 }), true)
})
