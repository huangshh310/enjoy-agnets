/**
 * L3 headline：有实测用 sessionUsageFor，没有才回退估算。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  estimateContextWindowStats,
  estimateCharTokens,
  overlayReportedUsage
} from "../components/ai-chat/right-pane/views/context/context-token-estimator.ts"
import {
  clearSessionUsage,
  rememberSessionUsage,
  reportedTurnTokens,
  sessionUsageFor
} from "./session-usage.ts"

const WINDOW = 200_000
const LONG_BODY = "hello world ".repeat(40)

function estimateOf(body: string) {
  return estimateContextWindowStats(
    [{ id: "1", role: "user", content: body, createdAt: Date.now() }],
    WINDOW
  )
}

test("有实测用量时 headline 用 sessionUsageFor，不走字符估算", () => {
  const sessionId = "ses_reported_usage"
  clearSessionUsage(sessionId)
  rememberSessionUsage(sessionId, { inputTokens: 1200, outputTokens: 40, totalTokens: 1240 })

  const estimate = estimateOf(LONG_BODY)
  assert.ok(estimate.usedTokens > 0)
  assert.notEqual(estimate.usedTokens, 1240)

  const reported = reportedTurnTokens(sessionUsageFor(sessionId))
  assert.equal(reported, 1240)

  const stats = overlayReportedUsage(estimate, reported)
  assert.equal(stats.usedTokens, 1240)
  assert.equal(stats.usagePercent, Number(((1240 / WINDOW) * 100).toFixed(1)))
  assert.equal(stats.buckets, estimate.buckets)
  clearSessionUsage(sessionId)
})

test("没有实测或只报窗口时 headline 回退估算", () => {
  const sessionId = "ses_estimate_fallback"
  clearSessionUsage(sessionId)
  const estimate = estimateOf(LONG_BODY)
  assert.equal(estimate.usedTokens, estimateCharTokens(LONG_BODY.length))

  assert.equal(reportedTurnTokens(sessionUsageFor(sessionId)), null)
  assert.equal(overlayReportedUsage(estimate, null), estimate)

  rememberSessionUsage(sessionId, { contextWindow: WINDOW })
  const leftover = sessionUsageFor(sessionId)
  assert.equal(leftover?.inputTokens, 0)
  assert.equal(leftover?.hasReportedTokens, false)
  assert.equal(reportedTurnTokens(leftover), null)

  const stats = overlayReportedUsage(estimate, reportedTurnTokens(leftover))
  assert.equal(stats.usedTokens, estimate.usedTokens)
  assert.equal(stats.usagePercent, estimate.usagePercent)
  clearSessionUsage(sessionId)
})
