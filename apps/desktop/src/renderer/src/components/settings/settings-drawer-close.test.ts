/**
 * 抽屉关闭：Esc 与关闭钮 no-drag。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { shouldCloseDrawerOnEscape } from "./settings-drawer-close.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("Esc 关闭：未 preventDefault 就关，其它键不关", () => {
  assert.equal(shouldCloseDrawerOnEscape({ key: "Escape", defaultPrevented: false }), true)
  assert.equal(shouldCloseDrawerOnEscape({ key: "Escape", defaultPrevented: true }), false)
  assert.equal(shouldCloseDrawerOnEscape({ key: "Enter", defaultPrevented: false }), false)
  assert.equal(shouldCloseDrawerOnEscape({ key: "Tab", defaultPrevented: false }), false)
})

test("SettingsSideDrawer 整层 no-drag，Esc 走关闭判定", () => {
  const src = readFileSync(join(dir, "settings-side-drawer.tsx"), "utf8")
  assert.match(src, /shouldCloseDrawerOnEscape/)
  assert.match(src, /data-app-region="no-drag"/)
  assert.match(src, /onClose\(\)/)
})

test("自动化抽屉 X 带 no-drag 且点击关闭", () => {
  const src = readFileSync(
    join(dir, "../automations/components/automation-drawer.tsx"),
    "utf8"
  )
  const close = src.slice(src.indexOf("data-testid=\"automation-drawer-close\""))
  assert.match(close, /data-app-region="no-drag"/)
  assert.match(close, /\[app-region:no-drag\]/)
  assert.match(close, /APP_REGION_NO_DRAG_STYLE|WebkitAppRegion/)
  assert.match(close, /onClick=\{onClose\}/)
})

test("其它共用抽屉头的关闭钮也标 no-drag", () => {
  const files = [
    "providers/provider-editor-drawer.tsx",
    "agent-tools/agent-tool-config-dialog-chrome.tsx",
    "agent-tools/custom-acp-agent-dialog.tsx",
    "../ai-chat/thread/sources/source-detail-sheet.tsx"
  ]
  for (const name of files) {
    const src = readFileSync(join(dir, name), "utf8")
    assert.match(src, /data-app-region="no-drag"/, `${name} missing no-drag`)
    assert.match(src, /\[app-region:no-drag\]/, `${name} missing CSS no-drag`)
  }
})

test("自动化列表不画空闲徽章", () => {
  const src = readFileSync(
    join(dir, "../automations/components/automation-row.tsx"),
    "utf8"
  )
  assert.match(src, /if \(status === "idle"\) return null/)
  assert.doesNotMatch(src, /statusIdle/)
})
