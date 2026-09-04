/**
 * Inspector 展开回退：1% 缝不能当成已经打开。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { needsInspectorDefaultSize } from "./inspector-panel-size.ts"

test("0 或 1% 缝需要强制默认宽度", () => {
  assert.equal(needsInspectorDefaultSize(0), true)
  assert.equal(needsInspectorDefaultSize(12), true)
  assert.equal(needsInspectorDefaultSize(279), true)
})

test("达到最小栏宽则不强制", () => {
  assert.equal(needsInspectorDefaultSize(280), false)
  assert.equal(needsInspectorDefaultSize(420), false)
})
