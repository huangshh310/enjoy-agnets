/**
 * 本机记录合计与拆分展示。
 */
import assert from "node:assert/strict"
import test from "node:test"
import {
  formatGrokUsd,
  grokTicksToUsd,
  hasMixedBreakdown,
  hasTokenBreakdown,
  sharePercent,
  sumBuckets
} from "./format.ts"

test("拆分全 0 不算有 breakdown", () => {
  assert.equal(hasTokenBreakdown({ inputTokens: 0, outputTokens: 0, cacheTokens: 0 }), false)
})

test("任一拆分大于 0 就算有 breakdown", () => {
  assert.equal(hasTokenBreakdown({ inputTokens: 12, outputTokens: 0, cacheTokens: 0 }), true)
})

test("sumBuckets 累加日桶", () => {
  const total = sumBuckets([
    {
      key: "2026-09-10",
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      totalTokens: 682_100,
      sessions: 4,
      breakdownSessions: 0,
      sourceIds: ["codex"]
    },
    {
      key: "2026-09-08",
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      totalTokens: 466_000,
      sessions: 15,
      breakdownSessions: 0,
      sourceIds: ["codex"]
    }
  ])
  assert.equal(total.totalTokens, 1_148_100)
  assert.equal(total.sessions, 19)
  assert.equal(hasTokenBreakdown(total), false)
})

test("Grok ticks 换算与格式", () => {
  assert.equal(grokTicksToUsd(10_000_000_000), 1)
  assert.equal(grokTicksToUsd(37_756_000), 0.0037756)
  assert.equal(formatGrokUsd(10_000_000_000), "$1.00")
  assert.equal(formatGrokUsd(37_756_000), "$0.0038")
  assert.equal(formatGrokUsd(0), "")
})

test("占比在无总量时不计算", () => {
  assert.equal(sharePercent(10, 0), undefined)
  assert.equal(sharePercent(25, 100), 25)
})

test("Codex 仅合计 + Grok 有拆分是混合源", () => {
  assert.equal(
    hasMixedBreakdown([
      {
        id: "codex",
        status: "has-usage",
        sessionCount: 19,
        fileCount: 19,
        inputTokens: 0,
        outputTokens: 0,
        cacheTokens: 0,
        totalTokens: 1_100_000
      },
      {
        id: "grok",
        status: "has-usage",
        sessionCount: 41,
        fileCount: 41,
        inputTokens: 7210,
        outputTokens: 1893,
        cacheTokens: 41000,
        totalTokens: 50103
      }
    ]),
    true
  )
})

test("只有 Grok 有拆分时不是混合", () => {
  assert.equal(
    hasMixedBreakdown([
      {
        id: "grok",
        status: "has-usage",
        sessionCount: 1,
        fileCount: 1,
        inputTokens: 10,
        outputTokens: 2,
        cacheTokens: 0,
        totalTokens: 12
      },
      {
        id: "claude",
        status: "directory-missing",
        sessionCount: 0,
        fileCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheTokens: 0,
        totalTokens: 0
      }
    ]),
    false
  )
})
