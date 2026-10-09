/**
 * CU-P1-36 设置铬：高级坐标出厂关，正文是人话，工程词只进 tooltip。
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

test("高级坐标正文和 tip 都是人话，不露工程词", () => {
  assert.equal(zh.advancedCoordsTitle, "高级坐标")
  assert.equal(zh.advancedCoordsDesc, "一般用不到。打开后每次用屏幕坐标都会先问你。")
  assert.equal(
    zh.advancedCoordsTip,
    "一般用不到。打开后每次用屏幕坐标都会先问你，失败时请让我先看一眼窗口。"
  )
  assert.doesNotMatch(zh.advancedCoordsDesc, /逃逸舱|elementId|snapshot|不吃/)
  assert.doesNotMatch(zh.advancedCoordsTip, /逃逸舱|elementId|snapshot|不吃|act\(/)
  assert.doesNotMatch(en.advancedCoordsDesc, /escape hatch|elementId|snapshot/i)
  assert.doesNotMatch(en.advancedCoordsTip, /escape hatch|elementId|snapshot|act\(/i)
  assert.match(zh.advancedCoordsTip, /先看一眼窗口/)
  assert.match(en.advancedCoordsTip, /look at the window/i)
})

test("产品页嵌开关，默认读 prefs 不当 true", () => {
  const row = readFileSync(join(ROOT, "desktop-advanced-coords-row.tsx"), "utf8")
  const page = readFileSync(join(ROOT, "../../computer-use/computer-use-settings.tsx"), "utf8")
  const hook = readFileSync(join(ROOT, "../../computer-use/use-computer-use-page.ts"), "utf8")
  assert.match(row, /advanced-coords-row/)
  assert.match(row, /advanced-coords-toggle/)
  assert.match(row, /advancedCoordsTip/)
  assert.match(page, /desktopAdvancedCoords === true/)
  assert.match(page, /DesktopAdvancedCoordsRow|onToggleAdvancedCoords/)
  assert.match(hook, /desktopAdvancedCoords: false/)
})
