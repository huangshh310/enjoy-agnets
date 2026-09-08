/**
 * Inspector 展开回退：1% 缝不能当成已经打开。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { needsInspectorDefaultSize, sanitizeSplitLayout } from "./inspector-panel-size.ts"

test("0 或 1% 缝需要强制默认宽度", () => {
  assert.equal(needsInspectorDefaultSize(0), true)
  assert.equal(needsInspectorDefaultSize(12), true)
  assert.equal(needsInspectorDefaultSize(279), true)
})

test("达到最小栏宽则不强制", () => {
  assert.equal(needsInspectorDefaultSize(280), false)
  assert.equal(needsInspectorDefaultSize(420), false)
})

test("chat 被存成 0 或一条缝时拉回 62/38", () => {
  assert.deepEqual(sanitizeSplitLayout({ chat: 0, changes: 100 }), { chat: 62, changes: 38 })
  assert.deepEqual(sanitizeSplitLayout({ chat: 1, changes: 99 }), { chat: 62, changes: 38 })
  assert.deepEqual(sanitizeSplitLayout({ chat: 62, changes: 38 }), { chat: 62, changes: 38 })
})
