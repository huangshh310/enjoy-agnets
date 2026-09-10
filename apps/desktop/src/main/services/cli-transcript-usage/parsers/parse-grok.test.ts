/**
 * Grok usage.json：session 合计、缺键回落、显式 0、忽略 turns。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { parseGrokUsageFile } from "./parse-grok.ts"

test("只读 session 合计，不累加 turns", () => {
  const usage = parseGrokUsageFile(
    JSON.stringify({
      updatedAt: "2026-09-08T06:32:11.040Z",
      session: {
        inputTokens: 7210,
        outputTokens: 1893,
        cachedReadTokens: 41000,
        cacheCreationTokens: 0,
        reasoningTokens: 412,
        totalTokens: 50103,
        primaryModelId: "grok-4.6",
        costUsdTicks: 126890500
      },
      turns: [
        {
          inputTokens: 7210,
          outputTokens: 1893,
          cachedReadTokens: 41000,
          totalTokens: 50103
        }
      ]
    })
  )
  assert.equal(usage?.totalTokens, 50103)
  assert.equal(usage?.inputTokens, 7210)
  assert.equal(usage?.outputTokens, 1893)
  assert.equal(usage?.cacheTokens, 41000)
  assert.equal(usage?.model, "grok-4.6")
  assert.equal(usage?.day, "2026-09-08")
  assert.equal(usage?.costUsdTicks, 126890500)
  assert.notEqual(usage?.totalTokens, 50103 * 2)
})

test("无 session 包一层时读顶层字段", () => {
  const usage = parseGrokUsageFile(
    JSON.stringify({
      updatedAt: "2026-09-09T00:00:00Z",
      inputTokens: 10,
      outputTokens: 2,
      cachedReadTokens: 0,
      totalTokens: 12,
      primaryModelId: "grok-4.6"
    })
  )
  assert.equal(usage?.totalTokens, 12)
  assert.equal(usage?.day, "2026-09-09")
})

test("缺 totalTokens 键时回落 input+output+cache", () => {
  const usage = parseGrokUsageFile(
    JSON.stringify({
      session: {
        inputTokens: 7210,
        outputTokens: 1893,
        cachedReadTokens: 41000,
        cacheCreationTokens: 0,
        primaryModelId: "grok-4.6"
      }
    })
  )
  assert.equal(usage?.totalTokens, 50103)
})

test("显式 totalTokens 0 且拆分全 0 不计 session", () => {
  const usage = parseGrokUsageFile(
    JSON.stringify({
      session: {
        inputTokens: 0,
        outputTokens: 0,
        cachedReadTokens: 0,
        totalTokens: 0
      }
    })
  )
  assert.equal(usage, null)
})

test("costUsdTicks 0 或缺失则 omit", () => {
  const missing = parseGrokUsageFile(
    JSON.stringify({ session: { inputTokens: 1, outputTokens: 0, totalTokens: 1 } })
  )
  assert.equal(missing?.costUsdTicks, undefined)
  const zero = parseGrokUsageFile(
    JSON.stringify({ session: { inputTokens: 1, outputTokens: 0, totalTokens: 1, costUsdTicks: 0 } })
  )
  assert.equal(zero?.costUsdTicks, undefined)
})
