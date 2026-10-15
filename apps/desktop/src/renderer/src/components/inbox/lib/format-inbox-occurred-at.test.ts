import assert from "node:assert/strict"
import { test } from "node:test"
import { formatInboxOccurredAt } from "./format-inbox-occurred-at.ts"

test("中文顶栏日期是 月日 时:分，不截成 10/10", () => {
  const ms = Date.UTC(2026, 9, 10, 14, 50)
  const local = new Date(ms)
  const expected = `${local.getMonth() + 1}月${local.getDate()}日 ${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`
  assert.equal(formatInboxOccurredAt(ms, "zh"), expected)
  assert.doesNotMatch(formatInboxOccurredAt(ms, "zh"), /\//)
})
