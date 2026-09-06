import assert from "node:assert/strict"
import { test } from "node:test"
import { quotaFromAntigravity, quotasFromAntigravityGroups, usedFromRemaining } from "./antigravity-quota.ts"

test("remaining_fraction 转成已用百分比", () => {
  assert.equal(usedFromRemaining(1), 0)
  assert.equal(usedFromRemaining(0), 100)
  assert.equal(Math.round(usedFromRemaining(0.31869414)), 68)
})

test("quota_groups 按分组视窗展开，不把剩余当已用", () => {
  const items = quotasFromAntigravityGroups([
    {
      display_name: "Gemini Models",
      buckets: [
        { bucket_id: "gemini-weekly", window: "weekly", remaining_fraction: 0.354, reset_time: "2026-09-11T05:55:31Z" },
        { bucket_id: "gemini-5h", window: "5h", remaining_fraction: 0, reset_time: "2026-09-06T12:04:07Z" }
      ]
    }
  ])
  assert.equal(items[0]?.name, "Gemini:5h")
  assert.equal(items[0]?.percentage, 100)
  assert.equal(Math.round(items[1]?.percentage ?? -1), 65)
})

test("没有分组就不编造额度", () => {
  assert.equal(quotaFromAntigravity([]), undefined)
})
