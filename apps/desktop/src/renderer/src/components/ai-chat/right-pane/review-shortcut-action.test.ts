import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { reviewShortcutAction } from "./review-shortcut-action"

test("审查已展开再按快捷键：收起", () => {
  assert.equal(reviewShortcutAction({ collapsed: false, activeKind: "review" }), "close")
})

test("右栏收起：打开审查", () => {
  assert.equal(reviewShortcutAction({ collapsed: true, activeKind: "review" }), "open")
})

test("右栏开着但在别的工具：打开审查", () => {
  assert.equal(reviewShortcutAction({ collapsed: false, activeKind: "files" }), "open")
})

test("还没开标签：打开审查", () => {
  assert.equal(reviewShortcutAction({ collapsed: true, activeKind: null }), "open")
})

test("快捷键接线走 reviewShortcutAction，不直接 reveal", () => {
  const src = readFileSync(new URL("./use-right-pane-shortcuts.ts", import.meta.url), "utf8")
  assert.match(src, /reviewShortcutAction/)
  assert.match(src, /setRightPanelCollapsed\(true\)/)
})
