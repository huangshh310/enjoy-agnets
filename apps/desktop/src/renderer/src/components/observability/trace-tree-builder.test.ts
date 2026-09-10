/**
 * Trace 只使用指标里有的 send / TTFO / done，不编造 RAG 或 token。
 */
import test from "node:test"
import assert from "node:assert/strict"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { buildTraceDataFromMetric } from "./services/trace-tree-builder.ts"

test("有 TTFO 时画 send → ttfo → done，不捏 MCP", () => {
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
  assert.equal(trace.estimatedCost, 0)
  assert.equal(trace.inputTokens, 14100)
  const names = (trace.rootSpan.children ?? []).map((child) => child.name)
  assert.deepEqual(names, ["run.send", "run.ttfo", "run.done"])
  assert.equal(names.includes("mcp.tool_call"), false)
  assert.equal(names.includes("context.load"), false)
})

test("有回放事件时追加 tool/approval span，仍不带 args", () => {
  const metric: TelemetryMetric = {
    id: "met_tools",
    runId: "run_tools",
    kind: "agent",
    status: "completed",
    durationMs: 1000,
    createdAt: Date.now()
  }
  const trace = buildTraceDataFromMetric(metric, undefined, [
    { type: "tool.start", toolName: "bash" },
    { type: "approval.required", toolName: "write_file" },
    { type: "approval.resolved", toolName: "write_file", decision: "allow" },
    { type: "text.delta" }
  ])
  const names = (trace.rootSpan.children ?? []).map((child) => child.name)
  assert.ok(names.includes("tool.bash"))
  assert.ok(names.includes("approval.write_file"))
  assert.ok(names.includes("approval.allow"))
  assert.equal(JSON.stringify(trace).includes("secret"), false)
})

test("缺 duration 与 token 时不填 1000ms / 850 token", () => {
  const metric: TelemetryMetric = {
    id: "met_sparse",
    runId: "run_sparse",
    kind: "text",
    status: "ok",
    createdAt: Date.now()
  }
  const trace = buildTraceDataFromMetric(metric)
  assert.equal(trace.totalDurationMs, 0)
  assert.equal(trace.inputTokens, 0)
  assert.equal(trace.outputTokens, 0)
  assert.equal(trace.rootSpan.children?.length, 1)
  assert.equal(trace.rootSpan.children?.[0]?.name, "run.send")
})
