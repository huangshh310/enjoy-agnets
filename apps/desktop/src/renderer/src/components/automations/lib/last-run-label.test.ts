import assert from "node:assert/strict"
import { test } from "node:test"
import { formatClock, formatLastRunWhen } from "./last-run-label.ts"

const noon = new Date(2026, 8, 21, 12, 0, 0).getTime()

test("今天 / 昨天 / 日历周", () => {
  const today = new Date(2026, 8, 21, 9, 2, 0).getTime()
  const yesterday = new Date(2026, 8, 20, 9, 0, 0).getTime()
  const friday = new Date(2026, 8, 18, 18, 1, 0).getTime()
  assert.match(formatLastRunWhen(today, noon, "zh"), /今天/)
  assert.match(formatLastRunWhen(yesterday, noon, "zh"), /昨天/)
  assert.equal(formatLastRunWhen(friday, noon, "zh").includes("上周五"), true)
  assert.match(formatLastRunWhen(today, noon, "en"), /today/)
})

test("中文抽屉时间是 24 小时，不带 AM/PM", () => {
  const afternoon = new Date(2026, 8, 21, 15, 4, 0).getTime()
  const clock = formatClock(afternoon, "zh")
  assert.equal(clock, "15:04")
  assert.doesNotMatch(clock, /AM|PM|上午|下午/i)
  assert.doesNotMatch(formatLastRunWhen(afternoon, noon, "zh"), /AM|PM|上午|下午/i)
})

test("本周写周X，上周才写上周X", () => {
  const saturday = new Date(2026, 9, 10, 12, 0, 0).getTime()
  const thursday = new Date(2026, 9, 8, 8, 0, 0).getTime()
  const lastFriday = new Date(2026, 9, 2, 18, 0, 0).getTime()
  assert.match(formatLastRunWhen(thursday, saturday, "zh"), /周四/)
  assert.equal(formatLastRunWhen(thursday, saturday, "zh").includes("上周四"), false)
  assert.match(formatLastRunWhen(lastFriday, saturday, "zh"), /上周五/)
})
