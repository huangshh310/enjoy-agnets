/**
 * §3.2e / H5：设置 Computer Use 文案不得把 Win/Linux 标成产品可用。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { enSettings } from "../../../i18n/catalogs/en/settings.ts"
import { zhSettings } from "../../../i18n/catalogs/zh/settings.ts"

const zh = zhSettings.builtinTools
const en = enSettings.builtinTools
const zhWinLinux = [zh.computerUseDesc, zh.platformHintWindows, zh.platformHintX11, zh.platformHintWayland]
const enWinLinux = [en.computerUseDesc, en.platformHintWindows, en.platformHintX11, en.platformHintWayland]

test("中英文 Computer Use 不把 Win/Linux 标成可用", () => {
  for (const text of zhWinLinux) {
    assert.match(text, /尚未标为可用|须等真机 GUI 冒烟/)
    assert.doesNotMatch(text, /已可用|已经可用|可后台点/)
  }
  for (const text of enWinLinux) {
    assert.match(text, /not marked available|GUI smoke/i)
    assert.doesNotMatch(text, /\bis available\b|\bare available\b|ready to use|can click in the background/i)
  }
  assert.match(zh.computerUseDesc, /仅 macOS 为支持路径/)
  assert.match(en.computerUseDesc, /macOS is the supported path/)
})

test("无图形会话提示保持诚实，不把 Win/Linux 写成可用", () => {
  assert.match(zh.platformHintNone, /没有图形会话/)
  assert.match(zh.platformHintNone, /不可用/)
  assert.match(en.platformHintNone, /no graphical session/i)
  assert.match(en.platformHintNone, /unavailable/)
  assert.doesNotMatch(zh.platformHintNone, /Windows|Linux|X11|Wayland/)
  assert.doesNotMatch(en.platformHintNone, /Windows|Linux|X11|Wayland/)
})
