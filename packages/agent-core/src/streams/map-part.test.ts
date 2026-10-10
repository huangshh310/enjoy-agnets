import assert from "node:assert/strict"
import { test } from "node:test"
import { DESKTOP_ACT_BARE_COORDS_DISABLED } from "@enjoy-agents/ipc-contract/desktop-act-codes"
import { DESKTOP_ACT_BARE_COORDS_DISABLED_REASON } from "../computer-use/desktop-act-honesty.ts"
import { mapStreamPart } from "./map-part.ts"

test("maps AI SDK 7 reasoning-delta text", () => {
  const event = mapStreamPart({ type: "reasoning-delta", text: "先列约束" }, "run_1")
  assert.deepEqual(event, { type: "reasoning.delta", runId: "run_1", text: "先列约束" })
})

test("finish 优先用 SDK v7 totalUsage", () => {
  assert.deepEqual(
    mapStreamPart(
      {
        type: "finish",
        usage: { inputTokens: 1, outputTokens: 1 },
        totalUsage: { inputTokens: 1200, outputTokens: 40, totalTokens: 1240 }
      },
      "run_1"
    ),
    { type: "usage.updated", runId: "run_1", inputTokens: 1200, outputTokens: 40, totalTokens: 1240 }
  )
})

test("finish-step 带上单步 inputTokens", () => {
  assert.deepEqual(
    mapStreamPart(
      { type: "finish-step", id: "s1", usage: { inputTokens: 30_000, outputTokens: 12 } },
      "run_1"
    ),
    { type: "step.end", runId: "run_1", stepId: "s1", inputTokens: 30_000 }
  )
})

test("maps usage and step lifecycle to v2 events", () => {
  assert.deepEqual(mapStreamPart({ type: "text-start", id: "t1" }, "run_1"), {
    type: "message.part.start",
    runId: "run_1",
    partId: "t1",
    partType: "text"
  })
  assert.deepEqual(
    mapStreamPart({ type: "finish", usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 } }, "run_1"),
    { type: "usage.updated", runId: "run_1", inputTokens: 3, outputTokens: 5, totalTokens: 8 }
  )
  assert.deepEqual(
    mapStreamPart(
      {
        type: "finish",
        usage: {
          inputTokens: 10,
          outputTokens: 4,
          cachedInputTokens: 2,
          cacheCreationInputTokens: 3,
          reasoningTokens: 1
        }
      },
      "run_1"
    ),
    {
      type: "usage.updated",
      runId: "run_1",
      inputTokens: 10,
      outputTokens: 4,
      totalTokens: 14,
      cacheReadTokens: 2,
      cacheWriteTokens: 3,
      reasoningTokens: 1
    }
  )
})

test("人工审批 request 才映射为 approval.required", () => {
  assert.deepEqual(
    mapStreamPart(
      {
        type: "tool-approval-request",
        approvalId: "apr_1",
        toolCallId: "tool_1",
        toolName: "write_file",
        args: { path: "index.html" }
      },
      "run_1"
    ),
    {
      type: "approval.required",
      runId: "run_1",
      toolCallId: "tool_1",
      approvalId: "apr_1",
      name: "write_file",
      args: { path: "index.html" }
    }
  )
})

test("SDK 自动放行的 approval request 不弹卡", () => {
  assert.equal(
    mapStreamPart(
      {
        type: "tool-approval-request",
        approvalId: "apr_auto",
        toolCallId: "tool_2",
        toolName: "write_file",
        isAutomatic: true
      },
      "run_1"
    ),
    null
  )
})

test("SDK 嵌套 toolCall + isAutomatic 也不弹卡", () => {
  assert.equal(
    mapStreamPart(
      {
        type: "tool-approval-request",
        approvalId: "apr_auto",
        isAutomatic: true,
        toolCall: { toolCallId: "tool_2", toolName: "write_file", input: { path: "a.html" } }
      },
      "run_1"
    ),
    null
  )
})

test("未知的点号类型会被丢弃", () => {
  assert.equal(mapStreamPart({ type: "not.a.thing", runId: "run_1", text: "nope" }, "run_1"), null)
  assert.equal(mapStreamPart({ type: "evil.inject", runId: "run_1" }, "run_1"), null)
})

test("合入 #126/#127 后审批与 tool.result 仍走白名单，不靠点号启发式", () => {
  const required = {
    type: "approval.required",
    runId: "run_1",
    toolCallId: "tool_1",
    approvalId: "apr_1",
    name: "write_file",
    args: { path: "e2e-stub.txt" }
  }
  const result = {
    type: "tool.result",
    runId: "run_1",
    toolCallId: "tool_1",
    name: "write_file",
    result: { ok: true, path: "e2e-stub.txt" }
  }
  assert.deepEqual(mapStreamPart(required, "run_1"), required)
  assert.deepEqual(mapStreamPart(result, "run_1"), result)
  assert.deepEqual(
    mapStreamPart(
      {
        type: "tool-result",
        toolCallId: "tool_stub_1",
        toolName: "write_file",
        input: { path: "e2e-stub.txt" },
        output: { ok: true, path: "e2e-stub.txt" }
      },
      "run_1"
    ),
    {
      type: "tool.result",
      runId: "run_1",
      toolCallId: "tool_stub_1",
      name: "write_file",
      result: { ok: true, path: "e2e-stub.txt" },
      args: { path: "e2e-stub.txt" }
    }
  )
})

test("passes through Enjoy StreamEvent from ACP", () => {
  assert.deepEqual(mapStreamPart({ type: "text.delta", runId: "run_1", text: "hi" }, "run_1"), {
    type: "text.delta",
    runId: "run_1",
    text: "hi"
  })
  assert.deepEqual(
    mapStreamPart(
      { type: "usage.updated", runId: "run_1", inputTokens: 12, reportedCostUsd: 0.4 },
      "run_1"
    ),
    { type: "usage.updated", runId: "run_1", inputTokens: 12, reportedCostUsd: 0.4 }
  )
  assert.deepEqual(
    mapStreamPart(
      { type: "generation.warning", runId: "run_1", code: "acp_resume_fallback", message: "fell back" },
      "run_1"
    ),
    { type: "generation.warning", runId: "run_1", code: "acp_resume_fallback", message: "fell back" }
  )
})

test("tool-output-denied 裸坐标：tool.result.result.code 给 renderer", () => {
  const event = mapStreamPart(
    {
      type: "tool-output-denied",
      toolCallId: "tool_coord",
      toolName: "desktop_act",
      args: { action: "click", x: 12, y: 34 },
      code: DESKTOP_ACT_BARE_COORDS_DISABLED
    },
    "run_1"
  )
  assert.deepEqual(event, {
    type: "tool.result",
    runId: "run_1",
    toolCallId: "tool_coord",
    name: "desktop_act",
    args: { action: "click", x: 12, y: 34 },
    result: { success: false, code: DESKTOP_ACT_BARE_COORDS_DISABLED },
    error: DESKTOP_ACT_BARE_COORDS_DISABLED
  })
  assert.ok(event)
  assert.equal(event.type, "tool.result")
  assert.equal((event.result as { code?: string } | undefined)?.code, DESKTOP_ACT_BARE_COORDS_DISABLED)
})

test("tool-output-denied 仅 reason 也折成合约码", () => {
  const event = mapStreamPart(
    {
      type: "tool-output-denied",
      toolCallId: "tool_coord",
      toolName: "desktop_act",
      reason: DESKTOP_ACT_BARE_COORDS_DISABLED_REASON
    },
    "run_1"
  )
  assert.ok(event)
  assert.equal(event.type, "tool.result")
  assert.deepEqual(event.result, { success: false, code: DESKTOP_ACT_BARE_COORDS_DISABLED })
  assert.equal(event.error, DESKTOP_ACT_BARE_COORDS_DISABLED)
})

test("tool-output-denied 仅坐标 args 也折成合约码", () => {
  const event = mapStreamPart(
    {
      type: "tool-output-denied",
      toolCallId: "tool_coord",
      toolName: "desktop_act",
      args: { action: "click", x: 12, y: 34 }
    },
    "run_1"
  )
  assert.ok(event)
  assert.equal(event.type, "tool.result")
  assert.deepEqual(event.result, { success: false, code: DESKTOP_ACT_BARE_COORDS_DISABLED })
  assert.equal(event.error, DESKTOP_ACT_BARE_COORDS_DISABLED)
})
