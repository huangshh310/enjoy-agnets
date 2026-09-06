import assert from "node:assert/strict"
import { test } from "node:test"
import { parseCursorDashboardUsage, parseGrokAuthPublic, parseGrokBillingCredits } from "./parse-official-usage.ts"

test("Cursor 用 includedSpend/limit，不用漂的 totalPercentUsed", () => {
  const quota = parseCursorDashboardUsage({
    displayMessage: "You've hit your usage limit",
    billingCycleEnd: "1789561588000",
    planUsage: {
      includedSpend: 40000,
      limit: 40000,
      totalPercentUsed: 70.39,
      autoPercentUsed: 10,
      apiPercentUsed: 80
    }
  })
  assert.equal(quota?.usedPercent, 100)
  assert.equal(quota?.windowType, "Included")
  assert.equal(quota?.modelQuotas?.some((item) => item.name === "api" && item.percentage === 80), true)
})

test("Cursor displayMessage 可回落百分比", () => {
  const quota = parseCursorDashboardUsage({
    displayMessage: "You've used 46% of your usage limit",
    planUsage: {}
  })
  assert.equal(quota?.usedPercent, 46)
})

test("Grok /usage 周额度与产品分栏", () => {
  const quota = parseGrokBillingCredits({
    config: {
      creditUsagePercent: 53,
      currentPeriod: { type: "USAGE_PERIOD_TYPE_WEEKLY", end: "2026-09-06T12:19:00.193680+00:00" },
      productUsage: [
        { product: "GrokBuild", usagePercent: 46 },
        { product: "GrokChat", usagePercent: 6 },
        { product: "GrokVoice", usagePercent: null }
      ]
    }
  })
  assert.equal(quota?.usedPercent, 53)
  assert.equal(quota?.windowType, "Grok · weekly")
  assert.equal(quota?.modelQuotas?.find((item) => item.name === "GrokBuild")?.percentage, 46)
  assert.equal(quota?.modelQuotas?.some((item) => item.name === "GrokVoice"), false)
})

test("Grok auth 只取公开身份", () => {
  const account = parseGrokAuthPublic({
    "https://auth.x.ai::slot": {
      email: "dev@example.com",
      first_name: "Ada",
      last_name: "Lovelace",
      key: "secret-should-not-leak"
    }
  })
  assert.equal(account?.email, "dev@example.com")
  assert.equal(account?.accountName, "Ada Lovelace")
  assert.equal(JSON.stringify(account).includes("secret"), false)
})
