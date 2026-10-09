import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations } from "../migrations/runner.ts"
import {
  approvalArgsMatch,
  canonicalizeJson,
  getApproval,
  insertApproval,
  nextApprovalId,
  planRememberApproval,
  setApprovalDecision,
  setApprovalSdkResponse
} from "./approvals.ts"

function decidedRow(overrides: Partial<Parameters<typeof insertApproval>[1]> = {}) {
  return {
    id: "apr_stub",
    runId: "run_1",
    toolCallId: "tool_stub",
    name: "write_file",
    args: JSON.stringify({ path: "e2e-stub.txt", content: "from stub" }),
    hmac: "x",
    decision: "deny" as string | null,
    createdAt: 1,
    requestArgs: JSON.stringify({ path: "e2e-stub.txt", content: "from stub" }),
    sdkApproved: 0,
    sdkReason: undefined,
    resumeCode: null,
    ...overrides
  }
}

test("审批行可写入并更新决定", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertApproval(db, {
    id: "apr_1",
    runId: "run_1",
    toolCallId: "tool_1",
    name: "write_file",
    args: "{}",
    hmac: "abc",
    decision: null,
    createdAt: 1
  })
  assert.equal(getApproval(db, "apr_1")?.name, "write_file")
  setApprovalDecision(db, "apr_1", "allow")
  assert.equal(getApproval(db, "apr_1")?.decision, "allow")
})

test("同一未决审批幂等复用 id，已决不换新 id", () => {
  const pending = { id: "apr_fixed", runId: "run_1", toolCallId: "tool_1", decision: null }
  const again = nextApprovalId(pending, { id: "apr_fixed", runId: "run_1", toolCallId: "tool_1" })
  assert.deepEqual(again, { id: "apr_fixed", action: "reuse" })
  const afterDeny = nextApprovalId(
    { ...pending, decision: "deny" },
    { id: "apr_fixed", runId: "run_1", toolCallId: "tool_1" }
  )
  assert.deepEqual(afterDeny, { id: "apr_fixed", action: "decided" })
})

test("同 id 但 run 或 toolCall 不同：fail closed 并打日志", () => {
  const errors: unknown[] = []
  const original = console.error
  console.error = (...args: unknown[]) => {
    errors.push(args)
  }
  try {
    const otherTool = nextApprovalId(
      { id: "apr_fixed", runId: "run_1", toolCallId: "tool_1", decision: null },
      { id: "apr_fixed", runId: "run_1", toolCallId: "tool_other" }
    )
    assert.deepEqual(otherTool, { id: "apr_fixed", action: "fail_closed" })
    const plan = planRememberApproval(
      decidedRow({ toolCallId: "tool_1" }),
      { id: "apr_stub", runId: "run_1", toolCallId: "tool_other", args: {} }
    )
    assert.equal(plan.action, "fail_closed")
    if (plan.action === "fail_closed") assert.equal(plan.cause, "identity")
    assert.ok(errors.length >= 1)
  } finally {
    console.error = original
  }
})

test("SDK 重发已拒绝 id：args 一致且已发出 response 则原样回放", () => {
  const plan = planRememberApproval(
    decidedRow(),
    {
      id: "apr_stub",
      runId: "run_1",
      toolCallId: "tool_stub",
      args: { path: "e2e-stub.txt", content: "from stub" }
    }
  )
  assert.deepEqual(plan, {
    id: "apr_stub",
    action: "replay",
    decision: "deny",
    approved: false,
    reason: undefined
  })
})

test("SDK 重发已决 id 但 args 不同：fail closed", () => {
  const existing = decidedRow({ decision: "allow", sdkApproved: 1 })
  const plan = planRememberApproval(
    existing,
    {
      id: "apr_stub",
      runId: "run_1",
      toolCallId: "tool_stub",
      args: { path: "other.txt", content: "changed" }
    }
  )
  assert.deepEqual(plan, {
    id: "apr_stub",
    action: "fail_closed",
    decision: "allow",
    cause: "args_mismatch"
  })
  assert.equal(approvalArgsMatch(existing.args, { path: "other.txt" }), false)
})

test("同一入参键顺序不同且 park 字段变化：判定为一致", () => {
  const raw = { observationId: "obs_1", action: "click", elementId: "el_1" }
  const parked = {
    thumbnailPath: "/thumbs/a.png",
    action: "click",
    elementId: "el_1",
    observationId: "obs_1",
    thumbnailDataUrl: "data:image/png;base64,aaa",
    appKey: "com.apple.Safari",
    sensitive: true,
    bypassesSessionAllow: false
  }
  const parkedAgain = {
    observationId: "obs_1",
    elementId: "el_1",
    action: "click",
    thumbnailPath: "/thumbs/b.png",
    thumbnailDataUrl: "data:image/png;base64,bbb",
    appKey: "com.apple.Safari",
    sensitive: false,
    bypassesSessionAllow: true
  }
  assert.equal(canonicalizeJson({ b: 1, a: 2 }), canonicalizeJson({ a: 2, b: 1 }))
  assert.equal(approvalArgsMatch(JSON.stringify(raw), parked), true)
  assert.equal(approvalArgsMatch(JSON.stringify(parked), parkedAgain), true)
  const plan = planRememberApproval(
    decidedRow({
      name: "desktop_act",
      args: JSON.stringify(parked),
      requestArgs: JSON.stringify(raw),
      decision: "allow",
      sdkApproved: 0,
      resumeCode: "stale_observation"
    }),
    { id: "apr_stub", runId: "run_1", toolCallId: "tool_stub", args: parkedAgain }
  )
  assert.equal(plan.action, "fail_closed")
  if (plan.action === "fail_closed") assert.equal(plan.cause, "resume_code")
})

test("没发过 SDK response 的已决 id：fail closed", () => {
  const plan = planRememberApproval(
    decidedRow({ decision: "allow", sdkApproved: null, resumeCode: null }),
    {
      id: "apr_stub",
      runId: "run_1",
      toolCallId: "tool_stub",
      args: { path: "e2e-stub.txt", content: "from stub" }
    }
  )
  assert.equal(plan.action, "fail_closed")
  if (plan.action === "fail_closed") assert.equal(plan.cause, "unsent")
})

test("desktop_act 回放 allow：fail closed", () => {
  const plan = planRememberApproval(
    decidedRow({
      name: "desktop_act",
      decision: "allow",
      sdkApproved: 1,
      requestArgs: JSON.stringify({ observationId: "obs_1", action: "click" }),
      args: JSON.stringify({ observationId: "obs_1", action: "click" })
    }),
    {
      id: "apr_stub",
      runId: "run_1",
      toolCallId: "tool_stub",
      args: { observationId: "obs_1", action: "click" }
    }
  )
  assert.equal(plan.action, "fail_closed")
  if (plan.action === "fail_closed") assert.equal(plan.cause, "desktop_act_allow")
})

test("落库 SDK response 后回放原样 approved/reason", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertApproval(db, decidedRow({ decision: "allow", sdkApproved: null }))
  setApprovalSdkResponse(db, "apr_stub", {
    approved: false,
    reason: "stale_observation",
    resumeCode: "stale_observation"
  })
  const row = getApproval(db, "apr_stub")
  assert.equal(row?.sdkApproved, 0)
  assert.equal(row?.resumeCode, "stale_observation")
  const plan = planRememberApproval(row, {
    id: "apr_stub",
    runId: "run_1",
    toolCallId: "tool_stub",
    args: { path: "e2e-stub.txt", content: "from stub" }
  })
  assert.equal(plan.action, "fail_closed")
  if (plan.action === "fail_closed") assert.equal(plan.cause, "resume_code")
})
