/**
 * Inspector 展开回退：1% 缝不能当成已经打开。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  inspectorDrawerWidth,
  inspectorOpenSize,
  inspectorRestorePercent,
  inspectorUsesDrawer,
  needsInspectorDefaultSize,
  preferredInspectorPercent,
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

test("拖完 / 点完按钮后的宽度才记成用户宽度；被压扁、收起不记", () => {
  assert.equal(preferredInspectorPercent({ asPercentage: 52, inPixels: 583 }), 52)
  assert.equal(preferredInspectorPercent({ asPercentage: 20, inPixels: 224 }), null)
  assert.equal(preferredInspectorPercent({ asPercentage: 0, inPixels: 0 }), null)
})

test("放宽后比用户上次的百分比窄、或被压成 0 就回到那个百分比，不是固定 38%", () => {
  assert.equal(inspectorRestorePercent({ asPercentage: 45, inPixels: 397 }, 52), 52)
  assert.equal(inspectorRestorePercent({ asPercentage: 0, inPixels: 0 }, 52), 52)
  // 已经不比它窄（含加宽按钮 58%）：不动。
  assert.equal(inspectorRestorePercent({ asPercentage: 52, inPixels: 583 }, 52), null)
  assert.equal(inspectorRestorePercent({ asPercentage: 58, inPixels: 650 }, 52), null)
  // 没有记录：按默认 38%。
  assert.equal(inspectorRestorePercent({ asPercentage: 0, inPixels: 0 }, null), 38)
  assert.equal(inspectorRestorePercent({ asPercentage: 38, inPixels: 426 }, null), null)
})

test("百分比在窄分栏里不到 280px 时按 280px 打开", () => {
  assert.equal(inspectorOpenSize(38, 1122), "38%")
  assert.equal(inspectorOpenSize(38, 682), "280px")
  assert.equal(inspectorOpenSize(52, 682), "52%")
  // 没量到分栏宽：照百分比。
  assert.equal(inspectorOpenSize(38, 0), "38%")
})
