/**
 * Loading State 耗时文案：秒级一位小数，满分钟改 `Nm Ss`。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { formatElapsedMs } from "./loading-state-format.ts"

test("formatElapsedMs 不足一分钟用秒", () => {
  assert.equal(formatElapsedMs(0), "0.0s")
  assert.equal(formatElapsedMs(1400), "1.4s")
  assert.equal(formatElapsedMs(-12), "0.0s")
})

test("formatElapsedMs 满分钟用 m + s", () => {
  assert.equal(formatElapsedMs(196_100), "3m 16.1s")
  assert.equal(formatElapsedMs(60_000), "1m 0.0s")
})
