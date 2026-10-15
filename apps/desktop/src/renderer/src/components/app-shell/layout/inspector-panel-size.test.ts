/**
 * Inspector 展开回退：1% 缝不能当成已经打开。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  inspectorDrawerWidth,
  inspectorUsesDrawer,
  needsInspectorDefaultSize,
  sanitizeSplitLayout
} from "./inspector-panel-size.ts"

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

test("分栏放不下工作台 360 + 分隔条 12 + 审查栏 280 时改走抽屉（768 / 733 宽）", () => {
  // 768 宽侧栏停靠：分栏约 463；733 宽侧栏收起：分栏约 648。
  assert.equal(inspectorUsesDrawer(463), true)
  assert.equal(inspectorUsesDrawer(648), true)
  assert.equal(inspectorUsesDrawer(651), true)
  // 1024 宽侧栏停靠：分栏约 719，照旧并排。
  assert.equal(inspectorUsesDrawer(652), false)
  assert.equal(inspectorUsesDrawer(719), false)
  // 还没量到宽度：按并排处理，不闪抽屉。
  assert.equal(inspectorUsesDrawer(0), false)
  assert.equal(inspectorUsesDrawer(Number.NaN), false)
})

test("抽屉宽最多 420、左边留 24，再窄也不为负", () => {
  assert.equal(inspectorDrawerWidth(648), 420)
  assert.equal(inspectorDrawerWidth(400), 376)
  assert.equal(inspectorDrawerWidth(10), 0)
})
