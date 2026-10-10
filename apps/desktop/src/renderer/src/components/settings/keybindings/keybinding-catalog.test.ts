/**
 * ⌘L / ⌘K 打开同一面板，设置页与快捷键表必须分名，禁止两行都叫「快速搜索与命令面板」。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zh } from "../../../i18n/catalogs/zh/index.ts"
import { labelKeysForBinding } from "./keybinding-catalog.ts"

test("⌘L 叫快速搜索，⌘K 叫命令面板", () => {
  const search = labelKeysForBinding("search.quick", "mod+l")
  const palette = labelKeysForBinding("search.quick", "mod+k")
  const settings = zh.settings as { shortcuts: Record<string, string> }
  assert.equal(settings.shortcuts.quickSearch, "快速搜索")
  assert.equal(settings.shortcuts.quickSearchAlt, "命令面板")
  assert.equal(settings.shortcuts.reviewDiff, "审查")
  assert.match(settings.shortcuts.cyclePermissionDesc, /输入框为空/)
  assert.doesNotMatch(settings.shortcuts.cyclePermissionDesc, /Composer/)
  assert.equal(search.actionKey, "settings.shortcuts.quickSearch")
  assert.equal(palette.actionKey, "settings.shortcuts.quickSearchAlt")
  assert.notEqual(settings.shortcuts.quickSearch, settings.shortcuts.quickSearchAlt)
})
