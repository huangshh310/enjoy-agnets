import assert from "node:assert/strict"
import { test } from "node:test"
import { barWidth, formatQuotaPercent, pickQuotaPercent, pickQuotaWindow } from "./agent-tool-quota.ts"

test("没有官方数字就不回落假百分比", () => {
  assert.equal(pickQuotaPercent(undefined), null)
  assert.equal(pickQuotaPercent({ hasQuota: false }), null)
  assert.equal(pickQuotaPercent({ hasQuota: true, windowType: "Ultra" }), null)
})

test("有官方 usedPercent 时不被同名模型视窗抢走", () => {
  assert.equal(
    pickQuotaPercent(
      {
        hasQuota: true,
        usedPercent: 100,
        windowType: "Included",
        modelQuotas: [{ name: "auto", displayName: "Cursor Models", percentage: 10, resetsIn: null, resetTime: null }]
      },
      "auto"
    ),
    100
  )
  assert.equal(
    pickQuotaWindow(
      {
        hasQuota: true,
        usedPercent: 100,
        windowType: "Included",
        modelQuotas: [{ name: "auto", displayName: "Cursor Models", percentage: 10, resetsIn: null, resetTime: null }]
      },
      "auto"
    ),
    "Included"
  )
})

test("按当前模型族匹配，取最紧的已用视窗", () => {
  const quota = {
    hasQuota: true,
    modelQuotas: [
      { name: "Gemini:weekly", displayName: "Gemini · weekly", percentage: 65, resetsIn: null, resetTime: null },
      { name: "Gemini:5h", displayName: "Gemini · 5h", percentage: 100, resetsIn: null, resetTime: null },
      { name: "Claude + GPT:weekly", displayName: "Claude + GPT · weekly", percentage: 68, resetsIn: null, resetTime: null },
      { name: "GPT:weekly", displayName: "GPT · weekly", percentage: 90, resetsIn: null, resetTime: null }
    ]
  }
  assert.equal(pickQuotaPercent(quota, "gemini-3.8-flash-high"), 100)
  assert.equal(pickQuotaWindow(quota, "gemini-3.8-flash-high"), "Gemini · 5h")
  assert.equal(pickQuotaPercent(quota, "claude-sonnet-4-6"), 68)
  assert.equal(pickQuotaPercent(quota, "gpt-5"), 90)
  assert.equal(pickQuotaPercent(quota, "composer-2.5"), null)
})

test("百分比文案右侧固定宽度可读", () => {
  assert.equal(formatQuotaPercent(18.2), "18%")
  assert.equal(formatQuotaPercent(100), "100%")
  assert.equal(formatQuotaPercent(null), "—")
  assert.equal(barWidth(null), 0)
  assert.equal(barWidth(0), 0)
})
