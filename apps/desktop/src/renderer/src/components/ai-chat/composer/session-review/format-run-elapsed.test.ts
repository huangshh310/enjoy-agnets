import assert from "node:assert/strict"
import { test } from "node:test"
import { formatRunElapsed } from "./format-run-elapsed.ts"

const zh = (path: string, vars?: Record<string, string | number>) => {
  if (path === "chat.elapsedSeconds") return `${vars?.n ?? 0}秒`
  if (path === "chat.elapsedMinutes") return `${vars?.m ?? 0}分 ${vars?.s ?? 0}秒`
  return path
}

const en = (path: string, vars?: Record<string, string | number>) => {
  if (path === "chat.elapsedSeconds") return `${vars?.n ?? 0}s`
  if (path === "chat.elapsedMinutes") return `${vars?.m ?? 0}m ${vars?.s ?? 0}s`
  return path
}

test("不足一分钟用整数秒", () => {
  assert.equal(formatRunElapsed(0, en), "0s")
  assert.equal(formatRunElapsed(14_000, en), "14s")
  assert.equal(formatRunElapsed(14_000, zh), "14秒")
})

test("超过一分钟用分+秒，不要小数", () => {
  assert.equal(formatRunElapsed(194_000, en), "3m 14s")
  assert.equal(formatRunElapsed(194_000, zh), "3分 14秒")
  assert.equal(formatRunElapsed(60_000, en), "1m 0s")
})

test("负值按 0 处理", () => {
  assert.equal(formatRunElapsed(-12, en), "0s")
})
