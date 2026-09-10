/**
 * 本机记录合计与拆分展示。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { hasTokenBreakdown, sharePercent, sumBuckets } from "./cli-usage-format.ts"

test("拆分全 0 不算有 breakdown", () => {
  assert.equal(
    hasTokenBreakdown({ inputTokens: 0, outputTokens: 0, cacheTokens: 0 }),
    false
  )
})

test("任一拆分大于 0 就算有 breakdown", () => {
  assert.equal(
    hasTokenBreakdown({ inputTokens: 12, outputTokens: 0, cacheTokens: 0 }),
    true
  )
})

test("sumBuckets 累加日桶", () => {
  const total = sumBuckets([
    {
      key: "2026-09-10",
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      totalTokens: 682_100,
      sessions: 4
    },
    {
      key: "2026-09-08",
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      totalTokens: 466_000,
      sessions: 15
    }
  ])
  assert.equal(total.totalTokens, 1_148_100)
  assert.equal(total.sessions, 19)
  assert.equal(hasTokenBreakdown(total), false)
})

test("占比在无总量时不计算", () => {
  assert.equal(sharePercent(10, 0), undefined)
  assert.equal(sharePercent(25, 100), 25)
})
