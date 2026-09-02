/**
 * Loading State 耗时文案：秒级一位小数，满分钟改分+秒；单位随语言切换。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { formatElapsedMs } from "./loading-state-format.ts"
import { setUiLocale } from "../../i18n/ui-locale.ts"

test("formatElapsedMs 中文默认用秒/分", () => {
  setUiLocale("zh")
  assert.equal(formatElapsedMs(0), "0.0秒")
  assert.equal(formatElapsedMs(1400), "1.4秒")
  assert.equal(formatElapsedMs(-12), "0.0秒")
  assert.equal(formatElapsedMs(196_100), "3分 16.1秒")
  assert.equal(formatElapsedMs(60_000), "1分 0.0秒")
})

test("formatElapsedMs 英文用 s / m s", () => {
  setUiLocale("en")
  assert.equal(formatElapsedMs(0), "0.0s")
  assert.equal(formatElapsedMs(1400), "1.4s")
  assert.equal(formatElapsedMs(196_100), "3m 16.1s")
  assert.equal(formatElapsedMs(60_000), "1m 0.0s")
  setUiLocale("zh")
})
