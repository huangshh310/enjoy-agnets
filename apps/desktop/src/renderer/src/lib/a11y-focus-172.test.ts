/**
 * #172 / #173 leftovers / #168 soft：焦点环接线与收起栏 inert、抽屉进焦、废弃文案。
 * 源码契约测试，不启 Electron。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../../../..")
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

test("主导航 rail-button 使用 focus-ring（不再只有 outline-none）", () => {
  const src = read("apps/desktop/src/renderer/src/components/app-shell/chrome/rail-button.tsx")
  assert.match(src, /\bfocus-ring\b/)
  assert.doesNotMatch(src, /outline-none/)
})

test("右栏 PANE_FOCUS 走 focus-ring；收起时 inspector-host 设 inert", () => {
  assert.match(read("apps/desktop/src/renderer/src/components/ai-chat/right-pane/constants.ts"), /export const PANE_FOCUS = "focus-ring"/)
  const pane = read("apps/desktop/src/renderer/src/components/app-shell/layout/inspector-pane.tsx")
  assert.match(pane, /inert=\{panelCollapsed && !drawerOpen \? true : undefined\}/)
  assert.match(pane, /aria-hidden=\{panelCollapsed && !drawerOpen \? true : undefined\}/)
})

test("无 GPU 侧栏不清掉 :focus-visible 的 box-shadow（焦点环）", () => {
  const css = read("packages/ui/styles/globals.css")
  assert.match(css, /aside\.rounded-3xl \*:not\(:focus-visible\)/)
  assert.match(css, /box-shadow:\s*none\s*!important/)
})

test("设置侧边抽屉打开后把焦点移进 panel", () => {
  const src = read("apps/desktop/src/renderer/src/components/settings/settings-side-drawer.tsx")
  assert.match(src, /panelRef/)
  assert.match(src, /target\.focus\(\)/)
  assert.match(src, /tabIndex=\{-1\}/)
})

test("tabs / scroll-area 用 focus-ring，避免双环 / Windows HC 丢指示", () => {
  const tabs = read("packages/ui/components/ui/tabs.tsx")
  assert.match(tabs, /\bfocus-ring\b/)
  assert.doesNotMatch(tabs, /focus-visible:border-border-focus-ring focus-visible:ring-1/)
  const scroll = read("packages/ui/components/ui/scroll-area.tsx")
  assert.match(scroll, /\bfocus-ring\b/)
  assert.doesNotMatch(scroll, /outline-none/)
})

test("经典皮肤 dark 覆盖 text-secondary；亮暗 secondary/tertiary 用可读档", () => {
  const theme = read("packages/ui/styles/theme.css")
  assert.match(theme, /--color-text-secondary:\s*var\(--color-neutral-600\)/)
  assert.match(theme, /--color-text-tertiary:\s*var\(--color-neutral-600\)/)
  const dark = theme.slice(theme.indexOf(".dark {"))
  assert.match(dark, /--color-text-secondary:\s*var\(--color-neutral-400\)/)
  assert.match(dark, /--color-text-tertiary:\s*var\(--color-neutral-400\)/)
})

test("入门页遗留 shortcutApproval 文案已删除", () => {
  for (const lang of ["zh", "en"]) {
    const src = read(`apps/desktop/src/renderer/src/i18n/catalogs/${lang}/settings.ts`)
    assert.doesNotMatch(src, /shortcutApproval/)
  }
})
