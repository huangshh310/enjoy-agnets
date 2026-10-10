import assert from "node:assert/strict"
import { test } from "node:test"
import { DESKTOP_ACT_BARE_COORDS_DISABLED, desktopActBareCoordsDeniedResult } from "./desktop-act-codes.ts"
import { APPROVAL_REPLAY_DENIED, APPROVAL_REPLAY_DENIED_COPY } from "./approval-not-executed.ts"
import { foldToolEvent, sealAbandonedTools } from "./fold-tool-event.ts"
import type { ThreadToolCall } from "./assistant-payload.ts"

test("探索 deny 的 tool.result error 折成 output-error", () => {
  const tools: ThreadToolCall[] = []
  foldToolEvent(tools, {
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "write_file",
    args: { path: "src/a.ts" },
    error: "Explore mode is read-only."
  })
  assert.equal(tools[0]?.state, "output-error")
  assert.equal(tools[0]?.errorText, "Explore mode is read-only.")
})

test("审批硬拒 tool.result 折进 ThreadToolCall.result.code", () => {
  const tools: ThreadToolCall[] = []
  const result = desktopActBareCoordsDeniedResult()
  foldToolEvent(tools, {
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "desktop_act",
    result,
    error: DESKTOP_ACT_BARE_COORDS_DISABLED
  })
  const folded = tools[0]
  assert.ok(folded)
  assert.equal(folded.name, "desktop_act")
  assert.equal(folded.state, "output-error")
  assert.equal(folded.errorText, DESKTOP_ACT_BARE_COORDS_DISABLED)
  assert.deepEqual(folded.result, result)
  assert.equal((folded.result as { code?: string }).code, result.code)
})

test("回放 fail closed 折成 output-denied，不是 output-error", () => {
  const tools: ThreadToolCall[] = []
  foldToolEvent(tools, {
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "desktop_act",
    result: { code: APPROVAL_REPLAY_DENIED },
    error: APPROVAL_REPLAY_DENIED_COPY
  })
  assert.equal(tools[0]?.state, "output-denied")
  assert.equal(tools[0]?.errorText, APPROVAL_REPLAY_DENIED_COPY)
})

test("带 resumeCode 的 tool.result 也折成 output-denied", () => {
  const tools: ThreadToolCall[] = []
  foldToolEvent(tools, {
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "desktop_act",
    result: { resumeCode: "stale_observation" }
  })
  assert.equal(tools[0]?.state, "output-denied")
})

test("收工封口：input-available 也封成 output-error，approval-requested 不动", () => {
  const sealed = sealAbandonedTools([
    { id: "t1", name: "write_file", state: "input-available" },
    { id: "t2", name: "write_file", state: "approval-requested" }
  ])
  assert.equal(sealed?.[0]?.state, "output-error")
  assert.equal(sealed?.[0]?.errorText, "No result received.")
  assert.equal(sealed?.[1]?.state, "approval-requested")
})

test("用户停封口：input-available 标 user_aborted，审批中标 cancelled 已停止", () => {
  const sealed = sealAbandonedTools(
    [
      { id: "t1", name: "write_file", state: "input-available", args: { path: "e2e-stub.txt" } },
      { id: "t2", name: "write_file", state: "approval-requested", args: { path: "later.txt" } }
    ],
    { aborted: true }
  )
  assert.equal(sealed?.[0]?.state, "output-error")
  assert.deepEqual(sealed?.[0]?.result, { code: "user_aborted" })
  assert.equal(sealed?.[1]?.state, "output-error")
  assert.deepEqual(sealed?.[1]?.result, { code: "user_aborted", decision: "cancelled" })
})

test("approval.resolved cancelled + run_failed 不是已停止", () => {
  const tools: ThreadToolCall[] = [
    { id: "t1", name: "write_file", state: "approval-requested", args: { path: "note.txt" } }
  ]
  foldToolEvent(tools, {
    type: "approval.resolved",
    runId: "r1",
    toolCallId: "t1",
    decision: "cancelled",
    code: "run_failed"
  })
  const row = tools[0]
  assert.ok(row)
  assert.equal(row.state, "output-error")
  const result = row.result as { decision?: string; code?: string }
  assert.equal(result.decision, "cancelled")
  assert.equal(result.code, "run_failed")
  assert.notEqual(result.code, "user_aborted")
})

test("approval.resolved cancelled 折成已停止，不是已拒绝", () => {
  const tools: ThreadToolCall[] = [
    { id: "t1", name: "write_file", state: "approval-requested", args: { path: "note.txt" } }
  ]
  foldToolEvent(tools, {
    type: "approval.resolved",
    runId: "r1",
    toolCallId: "t1",
    decision: "cancelled"
  })
  const row = tools[0]
  assert.ok(row)
  assert.equal(row.state, "output-error")
  const result = row.result as { decision?: string; code?: string }
  assert.equal(result.decision, "cancelled")
  assert.equal(result.code, "user_aborted")
})

test("delegate 子工具带 parentToolCallId 折进同一份 tools", () => {
  const tools: ThreadToolCall[] = []
  foldToolEvent(tools, {
    type: "tool.start",
    runId: "r1",
    toolCallId: "parent",
    name: "delegate",
    args: { task: "look around" }
  })
  foldToolEvent(tools, {
    type: "tool.start",
    runId: "r1",
    toolCallId: "child",
    name: "mcp_fs__move_file",
    args: { path: "a.ts" },
    parentToolCallId: "parent"
  })
  assert.equal(tools.length, 2)
  assert.equal(tools[0]?.name, "delegate")
  assert.equal(tools[1]?.name, "mcp_fs__move_file")
  assert.equal(tools[1]?.parentToolCallId, "parent")
})

test("本会话允许标记折进 ThreadToolCall", () => {
  const tools: ThreadToolCall[] = []
  foldToolEvent(tools, {
    type: "tool.start",
    runId: "r1",
    toolCallId: "t1",
    name: "write_file",
    args: { path: "a.ts" },
    allowedBySession: true
  })
  foldToolEvent(tools, {
    type: "approval.required",
    runId: "r1",
    toolCallId: "t2",
    approvalId: "a1",
    name: "bash",
    args: { command: "git status" },
    allowedBySession: false,
    reaskReason: "restart"
  })
  assert.equal(tools[0]?.allowedBySession, true)
  assert.equal(tools[1]?.allowedBySession, false)
  assert.equal(tools[1]?.reaskReason, "restart")
})

test("重新打开：库里 output-error + 拒绝码保持原态，不改写成 output-denied", () => {
  const sealed = sealAbandonedTools([
    {
      id: "tool_1",
      name: "desktop_act",
      state: "output-error",
      result: { code: APPROVAL_REPLAY_DENIED },
      errorText: APPROVAL_REPLAY_DENIED_COPY
    }
  ])
  assert.equal(sealed?.[0]?.state, "output-error")
  assert.equal(sealed?.[0]?.result && typeof sealed[0].result === "object" ? (sealed[0].result as { code?: string }).code : "", APPROVAL_REPLAY_DENIED)
})
