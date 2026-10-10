/**
 * consumeApprovalRequired：回填后允许；回填不了记 deny + SDK approved:false；零参弹卡。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { getApproval } from "@enjoy-agents/db"
import type { StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { consumeApprovalRequired } from "./consume-approval-required.ts"

const { getDatabase } = await import("./database.ts")

async function runConsume(input: {
  name: string
  args: unknown
  toolCallId: string
  approvalId: string
  runId: string
  tools: ThreadToolCall[]
}) {
  const cards: Array<{ approvalId: string; name: string; args?: unknown }> = []
  const sdk: Array<{ approvalId?: string; approved?: boolean }> = []
  const emitted: StreamEvent[] = []
  await consumeApprovalRequired(
    {
      type: "approval.required",
      runId: input.runId,
      approvalId: input.approvalId,
      toolCallId: input.toolCallId,
      name: input.name,
      args: input.args
    },
    {
      runId: input.runId,
      tools: input.tools,
      transcript: { visible: "", think: "", pendingThink: false },
      onApproval: (pending) => cards.push(pending),
      onDecidedReplay: (message) => {
        const part = Array.isArray(message.content) ? message.content[0] : undefined
        if (part && typeof part === "object") {
          sdk.push(part as { approvalId?: string; approved?: boolean })
        }
      },
      emit: (event) => emitted.push(event)
    },
    0,
    () => 0
  )
  return { cards, sdk, emitted, row: getApproval(getDatabase(), input.approvalId) }
}

test("回填后允许：HMAC / pending 带着真参", async () => {
  const result = await runConsume({
    name: "write_file",
    args: undefined,
    toolCallId: "tool_backfill",
    approvalId: "apr_backfill",
    runId: "run_backfill",
    tools: [
      {
        id: "tool_backfill",
        name: "write_file",
        state: "input-available",
        args: { path: "e2e-stub.txt", content: "hi" }
      }
    ]
  })
  assert.equal(result.cards.length, 1)
  assert.deepEqual(result.cards[0]?.args, { path: "e2e-stub.txt", content: "hi" })
  assert.equal(result.row?.decision, null)
  assert.equal(result.row?.name, "write_file")
  assert.equal(JSON.parse(result.row?.requestArgs ?? "{}").path, "e2e-stub.txt")
  assert.equal(JSON.parse(result.row?.args ?? "{}").path, "e2e-stub.txt")
  assert.equal(result.sdk.length, 0)
})

test("回填不了：库记 deny，SDK approved:false，不弹卡", async () => {
  const result = await runConsume({
    name: "write_file",
    args: undefined,
    toolCallId: "tool_missing",
    approvalId: "apr_missing",
    runId: "run_missing",
    tools: []
  })
  assert.equal(result.cards.length, 0)
  assert.equal(result.row?.decision, "deny")
  assert.equal(result.row?.sdkApproved, 0)
  assert.equal(result.sdk[0]?.approved, false)
  assert.equal(
    result.emitted.some((event) => event.type === "approval.required"),
    false
  )
  assert.equal(
    result.emitted.some((event) => event.type === "tool.result"),
    true
  )
})

test("零参 {} 正常弹卡", async () => {
  const result = await runConsume({
    name: "list_tables",
    args: {},
    toolCallId: "tool_zero",
    approvalId: "apr_zero",
    runId: "run_zero",
    tools: []
  })
  assert.equal(result.cards.length, 1)
  assert.deepEqual(result.cards[0]?.args, {})
  assert.equal(result.row?.decision, null)
  assert.deepEqual(JSON.parse(result.row?.requestArgs ?? "null"), {})
  assert.equal(result.sdk.length, 0)
})
