import assert from "node:assert/strict"
import { test } from "node:test"
import {
  initSidebarCollapse,
  onSidebarManual,
  onSidebarOverlayDismiss,
  onSidebarWidth,
  sidebarCollapsed,
  sidebarOverlay
} from "./sidebar-collapse-state.ts"

test("宽窗启动：沿用偏好，不自动收起", () => {
  assert.equal(sidebarCollapsed(initSidebarCollapse(false, false)), false)
  assert.equal(sidebarCollapsed(initSidebarCollapse(true, false)), true)
})

test("窄窗启动：偏好是展开也先收起，但偏好不变", () => {
  const s = initSidebarCollapse(false, true)
  assert.equal(sidebarCollapsed(s), true)
  assert.equal(s.preferred, false)
})

test("跨进窄窗自动收起不改偏好；回到宽窗恢复偏好（展开）", () => {
  let s = initSidebarCollapse(false, false)
  s = onSidebarWidth(s, true)
  assert.equal(sidebarCollapsed(s), true)
  assert.equal(s.preferred, false)
  s = onSidebarWidth(s, false)
  assert.equal(sidebarCollapsed(s), false)
})

test("偏好收起：窄窗进出都保持收起", () => {
  let s = initSidebarCollapse(true, false)
  s = onSidebarWidth(onSidebarWidth(s, true), false)
  assert.equal(sidebarCollapsed(s), true)
})

test("窄窗里手动展开：本次展开，窄窗内同宽变化不收回", () => {
  let s = onSidebarWidth(initSidebarCollapse(false, false), true)
  s = onSidebarManual(s, false)
  assert.equal(sidebarCollapsed(s), false)
  s = onSidebarWidth(s, true)
  assert.equal(sidebarCollapsed(s), false)
})

test("手动收起写进偏好；回宽窗仍收起；重启沿用", () => {
  let s = onSidebarManual(initSidebarCollapse(false, false), true)
  assert.equal(s.preferred, true)
  s = onSidebarWidth(onSidebarWidth(s, true), false)
  assert.equal(sidebarCollapsed(s), true)
  assert.equal(sidebarCollapsed(initSidebarCollapse(s.preferred, false)), true)
})

test("重启：只有手动偏好跨重启，自动收起不跨（窄窗时自动收起过，宽窗重启是展开）", () => {
  const before = onSidebarWidth(initSidebarCollapse(false, false), true)
  assert.equal(sidebarCollapsed(before), true)
  const after = initSidebarCollapse(before.preferred, false)
  assert.equal(sidebarCollapsed(after), false)
})

test("窄窗展开是浮层；点外部/Esc 关浮层只收本次、不写偏好，回宽窗恢复展开（luna z151-1）", () => {
  let s = initSidebarCollapse(false, true)
  assert.equal(sidebarOverlay(s), false)
  s = onSidebarManual(s, false)
  assert.equal(sidebarOverlay(s), true)
  s = onSidebarOverlayDismiss(s)
  assert.equal(sidebarCollapsed(s), true)
  assert.equal(s.preferred, false)
  s = onSidebarWidth(s, false)
  assert.equal(sidebarCollapsed(s), false)
  assert.equal(sidebarOverlay(s), false)
})

test("宽窗展开不是浮层，dismiss 不动状态", () => {
  const s = initSidebarCollapse(false, false)
  assert.equal(sidebarOverlay(s), false)
  assert.equal(onSidebarOverlayDismiss(s), s)
})
