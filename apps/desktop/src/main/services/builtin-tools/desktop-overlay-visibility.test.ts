/**
 * O1 / O3：overlay 只在已批 act 进行中可见；wait / 关开关 / 停后都不亮。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isDesktopActOverlayAction,
  overlayChromeCopy,
  shouldShowDesktopOverlay
} from "./desktop-overlay-visibility.ts"

test("click/type/key 等在控动作才亮，wait 不亮", () => {
  assert.equal(isDesktopActOverlayAction("click"), true)
  assert.equal(isDesktopActOverlayAction("type"), true)
  assert.equal(isDesktopActOverlayAction("key"), true)
  assert.equal(isDesktopActOverlayAction("move"), true)
  assert.equal(isDesktopActOverlayAction("drag"), true)
  assert.equal(isDesktopActOverlayAction("scroll"), true)
  assert.equal(isDesktopActOverlayAction("wait"), false)
  assert.equal(isDesktopActOverlayAction(""), false)
})

test("开关或视觉关时不亮，避免无观察装在控", () => {
  const acting = { action: "click", enabled: true, screenVisuals: true }
  assert.equal(shouldShowDesktopOverlay(acting), true)
  assert.equal(shouldShowDesktopOverlay({ ...acting, enabled: false }), false)
  assert.equal(shouldShowDesktopOverlay({ ...acting, screenVisuals: false }), false)
  assert.equal(shouldShowDesktopOverlay({ ...acting, action: "wait" }), false)
})

test("顶栏文案与 SoT 一致，空 app 用桌面回退", () => {
  assert.deepEqual(overlayChromeCopy("zh", "计算器"), {
    title: "正在操控 · 计算器",
    stopLabel: "停止",
    escHint: "按 Esc 停止",
    lang: "zh-CN"
  })
  assert.equal(overlayChromeCopy("zh", "  ").title, "正在操控 · 桌面")
  assert.equal(overlayChromeCopy("en", "Calculator").title, "Controlling · Calculator")
  assert.equal(overlayChromeCopy("en", "").stopLabel, "Stop")
})
