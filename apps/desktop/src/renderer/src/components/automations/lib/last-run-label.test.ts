import assert from "node:assert/strict"
import { test } from "node:test"
import { formatLastRunWhen } from "./last-run-label.ts"

const noon = new Date(2026, 8, 21, 12, 0, 0).getTime()

test("今天 / 昨天 / 上周", () => {
  const today = new Date(2026, 8, 21, 9, 2, 0).getTime()
  const yesterday = new Date(2026, 8, 20, 9, 0, 0).getTime()
  const friday = new Date(2026, 8, 18, 18, 1, 0).getTime()
  assert.match(formatLastRunWhen(today, noon, "zh"), /今天/)
  assert.match(formatLastRunWhen(yesterday, noon, "zh"), /昨天/)
  assert.match(formatLastRunWhen(friday, noon, "zh"), /周五/)
  assert.match(formatLastRunWhen(today, noon, "en"), /today/)
})
