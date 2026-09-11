import assert from "node:assert/strict"
import { test } from "node:test"
import { parseCursorExtraUsage, parseCursorGrokBotUsage } from "./parse-cursor-extras.ts"

test("Grok Bot 用 GetSandUsageStatus 的 usagePercent", () => {
  const window = parseCursorGrokBotUsage(
    {
      usagePercent: 30,
      hasNonZeroIncludedLimit: true,
      nextResetTimestampUtc: "2026-09-14T12:00:00.000Z",
      currentPeriodStart: "2026-09-07T12:00:00.000Z"
    },
    new Date("2026-09-11T12:00:00.000Z")
  )
  assert.equal(window?.displayName, "Grok Bot")
  assert.equal(window?.usedPercent, 30)
  assert.ok(window?.resetsIn)
})

test("企业池或零额度不画 Grok Bot", () => {
  assert.equal(parseCursorGrokBotUsage({ usagePercent: 10, usesPooledEnterpriseAllowance: true }), undefined)
  assert.equal(parseCursorGrokBotUsage({ usagePercent: 10, hasNonZeroIncludedLimit: false }), undefined)
})

test("Extra Usage 无 summary 也保留 No data 行", () => {
  const window = parseCursorExtraUsage(null)
  assert.equal(window.displayName, "Extra Usage")
  assert.equal(window.statusText, "No data")
})

test("Extra Usage 有 limit 则画百分比", () => {
  const window = parseCursorExtraUsage({
    individualUsage: { onDemand: { enabled: true, used: 0, limit: 25_000, remaining: 25_000 } }
  })
  assert.equal(window.statusText, undefined)
  assert.equal(window.usedPercent, 0)
})
