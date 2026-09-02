import assert from "node:assert/strict"
import { test } from "node:test"
import { mapStreamPart } from "./map-part.ts"

test("maps AI SDK 7 reasoning-delta text", () => {
  const event = mapStreamPart({ type: "reasoning-delta", text: "先列约束" }, "run_1")
  assert.deepEqual(event, { type: "reasoning.delta", runId: "run_1", text: "先列约束" })
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
