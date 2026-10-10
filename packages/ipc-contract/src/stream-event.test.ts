import assert from "node:assert/strict"
import { test } from "node:test"
import { StreamEvent, stampStreamEvent } from "./stream-event.ts"

test("旧 run.start / text.delta 仍可 safeParse", () => {
  const start = StreamEvent.safeParse({ type: "run.start", runId: "r1", sessionId: "s1" })
  assert.equal(start.success, true)
  const delta = StreamEvent.safeParse({ type: "text.delta", runId: "r1", text: "hi" })
  assert.equal(delta.success, true)
})

test("v2 事件带 sequence 并可 stamp", () => {
  const stamped = stampStreamEvent(
    { type: "source.added", runId: "r1", sourceId: "k1", title: "a.ts", path: "a.ts" },
    { sequence: 3, sessionId: "s1", timestamp: 10 }
  )
  const parsed = StreamEvent.safeParse(stamped)
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.type, "source.added")
    assert.equal(parsed.data.sequence, 3)
    assert.equal(parsed.data.sessionId, "s1")
  }
})

test("usage.updated 旧估算枚举不丢掉整条事件", () => {
  const parsed = StreamEvent.safeParse({
    type: "usage.updated",
    runId: "r1",
    inputTokens: 3,
    estimatedCost: { status: "legacy-status", usd: 0.2, source: "ancient" }
  })
  assert.equal(parsed.success, true)
  if (parsed.success && parsed.data.type === "usage.updated") {
    assert.equal(parsed.data.estimatedCost?.usd, 0.2)
    assert.equal(parsed.data.estimatedCost?.status, undefined)
    assert.equal(parsed.data.estimatedCost?.source, undefined)
  }
})

test("step.end 非法 inputTokens 丢掉字段不拒整条", () => {
  const parsed = StreamEvent.safeParse({
    type: "step.end",
    runId: "r1",
    stepId: "s",
    inputTokens: "nope"
  })
  assert.equal(parsed.success, true)
  if (parsed.success && parsed.data.type === "step.end") {
    assert.equal(parsed.data.inputTokens, undefined)
  }
})

test("approval.resolved.code 认 user_aborted / run_failed / catch_up_approval_timeout", () => {
  const aborted = StreamEvent.safeParse({
    type: "approval.resolved",
    runId: "r1",
    toolCallId: "t1",
    decision: "cancelled",
    code: "user_aborted"
  })
  const failed = StreamEvent.safeParse({
    type: "approval.resolved",
    runId: "r1",
    toolCallId: "t1",
    decision: "cancelled",
    code: "run_failed"
  })
  const catchUp = StreamEvent.safeParse({
    type: "approval.resolved",
    runId: "r1",
    toolCallId: "t1",
    decision: "cancelled",
    code: "catch_up_approval_timeout"
  })
  const other = StreamEvent.safeParse({
    type: "approval.resolved",
    runId: "r1",
    toolCallId: "t1",
    decision: "cancelled",
    code: "timeout"
  })
  assert.equal(aborted.success, true)
  assert.equal(failed.success, true)
  assert.equal(catchUp.success, true)
  assert.equal(other.success, false)
})

test("approval.resolved 认 cancelled，与用户 deny 分开", () => {
  const parsed = StreamEvent.safeParse({
    type: "approval.resolved",
    runId: "r1",
    toolCallId: "t1",
    decision: "cancelled"
  })
  assert.equal(parsed.success, true)
  if (parsed.success && parsed.data.type === "approval.resolved") {
    assert.equal(parsed.data.decision, "cancelled")
  }
})

test("未知 attention / workflow 回落，不丢掉整条终态事件", () => {
  const parsed = StreamEvent.safeParse({
    type: "run.error",
    runId: "r1",
    message: "boom",
    turn: { workflow: "legacy_done", attention: "weird" }
  })
  assert.equal(parsed.success, true)
  if (parsed.success && parsed.data.type === "run.error") {
    assert.equal(parsed.data.turn?.attention, "neutral")
    assert.equal(parsed.data.turn?.workflow, "todo")
  }
})

test("source.added 的 NaN score 丢掉字段不拒整条", () => {
  const parsed = StreamEvent.safeParse({
    type: "source.added",
    runId: "r1",
    sourceId: "k1",
    title: "a.ts",
    path: "a.ts",
    score: Number.NaN
  })
  assert.equal(parsed.success, true)
  if (parsed.success && parsed.data.type === "source.added") {
    assert.equal(parsed.data.score, undefined)
  }
})

test("approval.required 带 automationSource 与 estimatedCost 过闸", () => {
  const approval = StreamEvent.safeParse({
    type: "approval.required",
    runId: "r1",
    toolCallId: "t1",
    approvalId: "a1",
    name: "bash",
    args: { command: "ls" },
    automationSource: {
      automationId: "auto_1",
      automationName: "晨间",
      scheduledAt: 1,
      isCatchUp: false
    }
  })
  assert.equal(approval.success, true)
  const usage = StreamEvent.safeParse({
    type: "usage.updated",
    runId: "r1",
    inputTokens: 3,
    estimatedCost: { status: "estimated", usd: 0.12, source: "snapshot" }
  })
  assert.equal(usage.success, true)
})

test("tool / approval 事件可带 allowedBySession 与 reaskReason", () => {
  const start = StreamEvent.safeParse({
    type: "tool.start",
    runId: "r1",
    toolCallId: "t1",
    name: "write_file",
    allowedBySession: true,
    sessionAllowScope: { kind: "tool", toolName: "write_file" }
  })
  const result = StreamEvent.safeParse({
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "write_file",
    allowedBySession: true
  })
  const card = StreamEvent.safeParse({
    type: "approval.required",
    runId: "r1",
    toolCallId: "t1",
    approvalId: "a1",
    name: "write_file",
    allowedBySession: false,
    reaskReason: "restart"
  })
  const resume = StreamEvent.safeParse({
    type: "approval.required",
    runId: "r1",
    toolCallId: "t2",
    approvalId: "a2",
    name: "bash",
    allowedBySession: false,
    reaskReason: "restore"
  })
  assert.equal(start.success, true)
  assert.equal(result.success, true)
  assert.equal(card.success, true)
  assert.equal(resume.success, true)
  if (start.success && start.data.type === "tool.start") {
    assert.equal(start.data.allowedBySession, true)
    assert.deepEqual(start.data.sessionAllowScope, { kind: "tool", toolName: "write_file" })
  }
  if (card.success && card.data.type === "approval.required") {
    assert.equal(card.data.reaskReason, "restart")
  }
})

test("approval.required 缺 args 仍过闸（P1-a：zod4 的 z.unknown() 必填会丢整条）", () => {
  const parsed = StreamEvent.safeParse({
    type: "approval.required",
    runId: "r1",
    toolCallId: "t1",
    approvalId: "a1",
    name: "bash"
  })
  assert.equal(parsed.success, true)
})

test("未知 type 被拒绝", () => {
  const parsed = StreamEvent.safeParse({ type: "not.a.thing", runId: "r1" })
  assert.equal(parsed.success, false)
})

test("v2 事件全集可 safeParse", () => {
  const events = [
    { type: "message.part.start", runId: "r1", partId: "p", partType: "text" },
    { type: "message.part.end", runId: "r1", partId: "p" },
    { type: "structured.delta", runId: "r1", partial: { a: 1 } },
    { type: "asset.created", runId: "r1", assetId: "a", mediaType: "image/png", name: "n", size: 1 },
    { type: "usage.updated", runId: "r1", totalTokens: 8 },
    {
      type: "usage.updated",
      runId: "r1",
      cacheReadTokens: 2,
      estimatedCost: { status: "legacy-status", usd: 0.2 }
    },
    { type: "step.start", runId: "r1", stepId: "s" },
    { type: "step.end", runId: "r1", stepId: "s" },
    { type: "workflow.checkpoint", runId: "r1", checkpointId: "c", stepIndex: 0 },
    { type: "workflow.paused", runId: "r1" },
    { type: "mcp.tool", runId: "r1", serverId: "m", toolName: "t", phase: "start" },
    { type: "realtime.text", runId: "r1", text: "hi" },
    {
      type: "host.inject",
      runId: "r1",
      runtimeId: "cursor",
      mcp: { capability: "acp-passthrough", enabled: ["fs"], injected: ["fs"], skipped: [] },
      skills: {
        capability: "catalog-prompt",
        enabled: ["a11y"],
        injected: ["a11y"],
        skipped: [],
        mounted: false
      }
    },
    {
      type: "session.config",
      runId: "r1",
      configOptions: [
        {
          id: "reasoning_effort",
          name: "Effort",
          category: "thought_level",
          choices: [
            { value: "low", name: "Low" },
            { value: "high", name: "High" }
          ]
        }
      ]
    },
    { type: "session.title", runId: "r1", title: "Implement session list" }
  ]
  for (const event of events) {
    assert.equal(StreamEvent.safeParse(event).success, true, event.type)
  }
})
