/**
 * 嵌套抽屉里点模型下拉：弹出层必须比 nested 高，否则菜单在背面。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { SETTINGS_DRAWER_Z } from "./settings-overlay.ts"

test("弹出层高于 nested 抽屉", () => {
  assert.ok(SETTINGS_DRAWER_Z.float > SETTINGS_DRAWER_Z.nested)
  assert.ok(SETTINGS_DRAWER_Z.nested > SETTINGS_DRAWER_Z.base)
})

test("模型 Combobox 用 float 层，不用 z-60", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "providers/provider-model-field.tsx"),
    "utf8"
  )
  assert.ok(src.includes("SETTINGS_DRAWER_Z_CLASS.float"))
  assert.ok(!src.includes("z-60"))
})

test("nested Escape 尊重 defaultPrevented 与弹出层", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "settings-side-drawer.tsx"),
    "utf8"
  )
  assert.ok(src.includes("event.defaultPrevented"))
  assert.ok(src.includes("popover-content"))
})

test("侧栏抽屉用同一套叠层常量", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "settings-side-drawer.tsx"),
    "utf8"
  )
  assert.ok(src.includes("SETTINGS_DRAWER_Z_CLASS.nested"))
  assert.ok(src.includes("SETTINGS_DRAWER_Z_CLASS.base"))
})
