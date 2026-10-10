import assert from "node:assert/strict"
import { test } from "node:test"
import { interpolate } from "../i18n/lookup.ts"
import { zhChat } from "../i18n/catalogs/zh/chat.ts"
import { enChat } from "../i18n/catalogs/en/chat.ts"
import { formatSidebarTime, sidebarTimeParts } from "./sidebar-time.ts"

const noon = Date.parse("2026-10-10T12:00:00")

function zh(path: string, vars?: Record<string, string | number>): string {
  const table: Record<string, string> = {
    "chat.timeJustNow": zhChat.timeJustNow,
    "chat.timeMinutes": zhChat.timeMinutes,
    "chat.timeHours": zhChat.timeHours,
    "chat.timeYesterday": zhChat.timeYesterday,
    "chat.timeDays": zhChat.timeDays
  }
  return interpolate(table[path] ?? path, vars)
}

test("中文相对时间是刚刚 / N 分钟 / N 小时 / 昨天", () => {
  assert.equal(formatSidebarTime(noon - 20_000, zh, noon), "刚刚")
  assert.equal(formatSidebarTime(noon - 3 * 60_000, zh, noon), "3 分钟")
  assert.equal(formatSidebarTime(noon - 5 * 3600_000, zh, noon), "5 小时")
  assert.equal(formatSidebarTime(Date.parse("2026-10-09T18:00:00"), zh, noon), "昨天")
  assert.doesNotMatch(formatSidebarTime(noon - 3 * 60_000, zh, noon), /now|3m/)
  assert.equal(zhChat.timeJustNow, "刚刚")
  assert.equal(interpolate(zhChat.timeMinutes, { n: 3 }), "3 分钟")
  assert.equal(interpolate(enChat.timeMinutes, { n: 3 }), "3m")
})

test("分档不把昨天收成 N 天", () => {
  assert.deepEqual(sidebarTimeParts(noon - 30_000, noon), { key: "justNow" })
  assert.deepEqual(sidebarTimeParts(noon - 3 * 60_000, noon), { key: "minutes", n: 3 })
  assert.equal(sidebarTimeParts(Date.parse("2026-10-09T08:00:00"), noon)?.key, "yesterday")
})
