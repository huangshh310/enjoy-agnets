/**
 * CU-P1-36 设置铬：高级坐标出厂关，文案钉逃逸舱，不吃会话/始终允许。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { enSettings } from "../../../../i18n/catalogs/en/settings.ts"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"

const ROOT = dirname(fileURLToPath(import.meta.url))
const zh = zhSettings.builtinTools
const en = enSettings.builtinTools

test("高级坐标中英文钉逃逸舱，不是主路径", () => {
  assert.equal(zh.advancedCoordsTitle, "高级坐标")
  assert.equal(zh.advancedCoordsBadge, "逃逸舱")
  assert.match(zh.advancedCoordsDesc, /elementId/)
  assert.match(zh.advancedCoordsDesc, /每次仍需审批/)
  assert.match(zh.advancedCoordsDesc, /不吃本会话\/始终允许/)
  assert.match(zh.advancedCoordsFoot, /snapshot/)
  assert.match(en.advancedCoordsBadge, /Escape hatch/i)
  assert.match(en.advancedCoordsDesc, /elementId/)
  assert.doesNotMatch(zh.advancedCoordsDesc, /主路径是坐标|像素主路径/)
  assert.doesNotMatch(en.advancedCoordsDesc, /default on|pixel primary/i)
})

test("产品页嵌开关，默认读 prefs 不当 true", () => {
  const row = readFileSync(join(ROOT, "desktop-advanced-coords-row.tsx"), "utf8")
  const page = readFileSync(join(ROOT, "../../computer-use/computer-use-settings.tsx"), "utf8")
  const hook = readFileSync(join(ROOT, "../../computer-use/use-computer-use-page.ts"), "utf8")
  assert.match(row, /advanced-coords-row/)
  assert.match(row, /advanced-coords-toggle/)
  assert.match(page, /desktopAdvancedCoords === true/)
  assert.match(page, /DesktopAdvancedCoordsRow|onToggleAdvancedCoords/)
  assert.match(hook, /desktopAdvancedCoords: false/)
})
