/**
 * 模型路由聚合：P95 忽略 0ms，不伪造上游 Endpoint/{id}。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { buildRoutingRows } from "./build-routing-rows.ts"

function metric(partial: Partial<TelemetryMetric> & Pick<TelemetryMetric, "id" | "modelId" | "status">): TelemetryMetric {
  return {
    runId: partial.runId ?? "run",
    kind: partial.kind ?? "agent",
    createdAt: partial.createdAt ?? 1,
    durationMs: partial.durationMs,
    inputTokens: partial.inputTokens,
    outputTokens: partial.outputTokens,
    ...partial
  } as TelemetryMetric
}

test("buildRoutingRows 用真实 duration 算 P95，不把 0ms 算进去", () => {
  const rows = buildRoutingRows(
    [{ id: "grok-4", label: "Grok 4", provider: "xai", apiStyle: "openai-compatible" }],
    [
      metric({ id: "a", modelId: "grok-4", status: "success", durationMs: 100 }),
      metric({ id: "b", modelId: "grok-4", status: "success", durationMs: 0 }),
      metric({ id: "c", modelId: "grok-4", status: "failed", durationMs: 400 })
    ]
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.upstreamName, "openai-compatible · grok-4")
  assert.equal(rows[0]?.callCount, 3)
  assert.equal(rows[0]?.p95DurationMs, 400)
  assert.equal(rows[0]?.successRate, 67)
})

test("未配置模型标 unconfigured，不伪造 100% 成功率", () => {
  const rows = buildRoutingRows([], [metric({ id: "x", modelId: "ghost", status: "success", durationMs: 12 })])
  assert.equal(rows[0]?.status, "unconfigured")
  assert.equal(rows[0]?.upstreamName, "ghost")
})
