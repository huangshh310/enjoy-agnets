import assert from "node:assert/strict"
import { test } from "node:test"
import {
  createOverlayNavWatcher,
  overlayClickClosesAfterSelect,
  overlayClosesOnNavigation,
  overlayKeyAction
} from "./nav-overlay-keys.ts"
import {
  initSidebarCollapse,
  onSidebarManual,
  onSidebarWidth,
  sidebarManualPersists,
  sidebarOverlay
} from "./sidebar-collapse-state.ts"

const base = { shiftKey: false, defaultPrevented: false, focusInside: true, nothingFocused: false, atFirst: false, atLast: false }

test("Esc：焦点在浮层内关；无元素聚焦也关（leo S-a）；焦点在别处（菜单 / 弹窗）不抢", () => {
  assert.equal(overlayKeyAction({ ...base, key: "Escape" }), "dismiss")
  assert.equal(overlayKeyAction({ ...base, key: "Escape", focusInside: false, nothingFocused: true }), "dismiss")
  assert.equal(overlayKeyAction({ ...base, key: "Escape", focusInside: false }), "none")
  assert.equal(overlayKeyAction({ ...base, key: "Escape", defaultPrevented: true }), "none")
})

test("Tab 焦点陷阱：尾项 Tab 回首项，首项 Shift+Tab 到尾项，中间不拦", () => {
  assert.equal(overlayKeyAction({ ...base, key: "Tab", atLast: true }), "wrap-first")
  assert.equal(overlayKeyAction({ ...base, key: "Tab", shiftKey: true, atFirst: true }), "wrap-last")
  assert.equal(overlayKeyAction({ ...base, key: "Tab" }), "none")
  assert.equal(overlayKeyAction({ ...base, key: "Tab", focusInside: false, atLast: true }), "none")
})

const el = (matches: string[]) => ({ closest: (sel: string) => (matches.some((m) => sel.includes(m)) ? {} : null) })

test("点会话行关浮层（含当前会话），点行菜单不关，点别处不关", () => {
  assert.equal(overlayClickClosesAfterSelect(el(["sidebar-session-row"])), true)
  assert.equal(overlayClickClosesAfterSelect(el(["sidebar-session-row", "session-row-menu"])), false)
  assert.equal(overlayClickClosesAfterSelect(el([])), false)
  assert.equal(overlayClickClosesAfterSelect(null), false)
})

test("路由 / 会话变化统一关浮层；浮层没开或没变化不动（luna #154-2）", () => {
  assert.equal(overlayClosesOnNavigation("/", "/automations", true), true)
  assert.equal(overlayClosesOnNavigation("/", "/", true), false)
  assert.equal(overlayClosesOnNavigation("/", "/board", false), false)
})

test("M1：窄窗开关不写偏好，宽窗才写", () => {
  const narrow = onSidebarWidth(initSidebarCollapse(true, false), true)
  assert.equal(sidebarManualPersists(narrow), false)
  assert.equal(sidebarOverlay(onSidebarManual(narrow, false)), true)
  assert.equal(sidebarManualPersists(initSidebarCollapse(true, false)), true)
})

test("路由变化时关浮层：开着时切到看板 / 自动化关；没开不关；同一路由不重复关（leo #154 S5）", () => {
  let dismissed = 0
  const watch = createOverlayNavWatcher("/|s1", () => dismissed++)
  watch("/|s1", true)
  assert.equal(dismissed, 0)
  watch("/board|s1", true)
  assert.equal(dismissed, 1)
  watch("/automations|s1", false)
  assert.equal(dismissed, 1)
  watch("/automations|s2", true)
  assert.equal(dismissed, 2)
  watch("/automations|s2", true)
  assert.equal(dismissed, 2)
})
