import assert from "node:assert/strict"
import { test } from "node:test"
import {
  parseCursorDashboardUsage,
  parseGrokAuthPublic,
  parseGrokBillingCredits,
  parseClaudeUsageResponse,
  parseCodexUsageResponse
} from "./parse-official-usage.ts"

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
  assert.equal(quota?.windows?.some((w) => w.name === "cursor-models" && w.usedPercent === 10), true)
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
  assert.equal(quota?.windows?.[0]?.name, "weekly")
  assert.equal(quota?.windows?.some((item) => item.name === "GrokBuild"), true)
  assert.equal(quota?.windows?.find((item) => item.id === "extra-usage")?.statusText, "Disabled")
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

test("Claude OAuth usage 解析多窗口与 Pacing", () => {
  const quota = parseClaudeUsageResponse({
    five_hour: { used_percent: 48, resets_at: "2026-09-12T15:00:00.000Z" },
    seven_day: { used_percent: 65, resets_at: "2026-09-16T12:00:00.000Z" },
    seven_day_sonnet: { used_percent: 22, resets_at: "2026-09-16T12:00:00.000Z" }
  })
  assert.equal(quota?.hasQuota, true)
  assert.equal(quota?.usedPercent, 48)
  assert.equal(quota?.windows?.length, 3)
  assert.equal(quota?.windows?.[0]?.name, "session")
  assert.equal(quota?.windows?.[0]?.usedPercent, 48)
  assert.equal(quota?.windows?.[1]?.name, "weekly")
  assert.equal(quota?.windows?.[1]?.usedPercent, 65)
  assert.equal(quota?.windows?.[2]?.name, "sonnet")
  assert.equal(quota?.windows?.[2]?.usedPercent, 22)
})

test("Codex wham usage 解析 Session/Weekly 与 Reset Credits", () => {
  const quota = parseCodexUsageResponse(
    {
      rate_limit: {
        primary_window: { used_percent: 85, reset_at: 1789561588, limit_window_seconds: 18000 },
        secondary_window: { used_percent: 40, reset_at: 1790000000, limit_window_seconds: 604800 }
      },
      rate_limit_reset_credits: { available_count: 2 }
    },
    {
      credits: [
        { credit_id: "credit-1", expires_at: 1790561588 },
        { credit_id: "credit-2", expires_at: 1791561588 }
      ]
    }
  )
  assert.equal(quota?.hasQuota, true)
  assert.equal(quota?.usedPercent, 85)
  assert.equal(quota?.windows?.length, 2)
  assert.equal(quota?.windows?.[0]?.name, "primary")
  assert.equal(quota?.windows?.[0]?.usedPercent, 85)
  assert.equal(quota?.resetCredits?.availableCount, 2)
  assert.equal(quota?.resetCredits?.credits?.length, 2)
})
