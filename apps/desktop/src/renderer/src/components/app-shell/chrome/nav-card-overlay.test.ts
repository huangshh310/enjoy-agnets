import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const src = readFileSync(new URL("./nav-card.tsx", import.meta.url), "utf8")
const store = readFileSync(new URL("../../../stores/chat-store.ts", import.meta.url), "utf8")

test("M1：窄窗开关不写偏好（store 写偏好前看 sidebarManualPersists）", () => {
  const fn = store.slice(store.indexOf("setSidebarCollapsed:"), store.indexOf("setSidebarNarrow:"))
  assert.match(fn, /if \(sidebarManualPersists\(state\.sidebarCollapseState\)\) writeSidebarCollapsed/)
})

test("S2：轨道切换用 store 的 narrow，不再直接读 innerWidth", () => {
  const fn = src.slice(src.indexOf("function handleSelect"), src.indexOf("const card ="))
  assert.doesNotMatch(fn, /innerWidth/)
  assert.match(fn, /!narrow/)
  assert.equal(src.match(/innerWidth/g)?.length, 1)
})

test("S3：切模块、点会话行（含当前会话）都关浮层，行菜单不算", () => {
  assert.match(src, /if \(overlay\) dismissOverlay\(\)/)
  assert.match(src, /closest\('\[data-testid="sidebar-session-row"\]'\)/)
  assert.match(src, /closest\('\[data-testid="session-row-menu"\]'\)/)
})

test("S1：Esc 只在浮层 DOM 内处理、不挂 document；Tab 焦点陷阱", () => {
  assert.doesNotMatch(src, /document\.addEventListener\("keydown"/)
  assert.match(src, /aside\.contains\(event\.target\)/)
  assert.match(src, /onKeyDown=\{overlay \? handleOverlayKeyDown/)
  assert.match(src, /last\.focus\(\)/)
  assert.match(src, /first\.focus\(\)/)
})
