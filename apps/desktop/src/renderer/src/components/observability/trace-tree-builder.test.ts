/**
 * Trace Span 树构建与时序偏移算法单测
 */
import test from "node:test"
import assert from "node:assert/strict"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { buildTraceDataFromMetric } from "./services/trace-tree-builder.ts"

test("buildTraceDataFromMetric 成功生成多阶段 Span 树与 Gantt 时序条", () => {
  const sampleMetric: TelemetryMetric = {
    id: "met_test_123",
    runId: "run_test_456",
    kind: "agent",
    modelId: "gpt-4o",
    status: "completed",
    durationMs: 2600,
    ttfoMs: 130,
    inputTokens: 14100,
    outputTokens: 1700,
    tokensPerSecond: 38.5,
    createdAt: Date.now()
  }

  const trace = buildTraceDataFromMetric(sampleMetric)

  assert.equal(trace.traceId, "run_test_456")
  assert.equal(trace.status, "success")
  assert.equal(trace.totalDurationMs, 2600)
  assert.equal(trace.firstTokenMs, 130)
  assert.ok(trace.totalSpans >= 4) // root + context + plan + tool + stream
  assert.equal(trace.errorSpans, 0)
  assert.ok(trace.estimatedCost > 0)

  // 验证根节点
  const root = trace.rootSpan
  assert.equal(root.name, "agent.agent")
  assert.equal(root.kind, "agent")
  assert.equal(root.durationMs, 2600)
  assert.ok(root.children && root.children.length >= 3)

  // 验证子节点时序偏移严格递增
  const children = root.children!
  let prevOffset = 0
  for (const child of children) {
    assert.ok(child.startOffsetMs >= prevOffset)
    assert.ok(child.durationMs > 0)
    prevOffset = child.startOffsetMs
    assert.ok(child.input?.content)
    assert.ok(child.output?.content)
  }
})
