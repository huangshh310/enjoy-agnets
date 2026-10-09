import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations } from "../migrations/runner.ts"
import {
  approvalArgsMatch,
  canonicalizeJson,
  getApproval,
  getApprovalBySdkIdentity,
  insertApproval,
  nextApprovalId,
  planRememberApproval,
  setApprovalDecision,
  setApprovalSdkResponse
} from "./approvals.ts"

function decidedRow(overrides: Partial<Parameters<typeof insertApproval>[1]> = {}) {
  return {
    id: "apr_internal",
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
    sdkApprovalId: "apr_stub",
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
    createdAt: 1,
    sdkApprovalId: "apr_sdk"
  })
  assert.equal(getApproval(db, "apr_1")?.sdkApprovalId, "apr_sdk")
  setApprovalDecision(db, "apr_1", "allow")
  assert.equal(getApproval(db, "apr_1")?.decision, "allow")
})

test("同一未决审批幂等复用内部 id，已决不换新 id", () => {
  const pending = { id: "apr_fixed", decision: null }
  const again = nextApprovalId(pending, () => "apr_new")
  assert.deepEqual(again, { id: "apr_fixed", action: "reuse" })
  const afterDeny = nextApprovalId({ id: "apr_fixed", decision: "deny" }, () => "apr_new")
  assert.deepEqual(afterDeny, { id: "apr_fixed", action: "decided" })
  const fresh = nextApprovalId(undefined, () => "apr_alloc")
  assert.deepEqual(fresh, { id: "apr_alloc", action: "insert" })
})

test("两个不同 run 用同一个 SDK id：第二个仍是新请求", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertApproval(db, decidedRow({ decision: "deny", sdkApproved: 0 }))
  const otherRun = getApprovalBySdkIdentity(db, {
    sdkApprovalId: "apr_stub",
    runId: "run_other",
    toolCallId: "tool_stub"
  })
  assert.equal(otherRun, undefined)
  const plan = planRememberApproval(otherRun, { sdkApprovalId: "apr_stub", args: { path: "e2e-stub.txt" } }, () => "apr_new")
  assert.equal(plan.action, "insert")
  assert.equal(plan.id, "apr_new")
  assert.equal(plan.sdkApprovalId, "apr_stub")
})

test("同一 run、同一 toolCall 重发已拒绝 id：原样回放", () => {
  const plan = planRememberApproval(
    decidedRow(),
    { sdkApprovalId: "apr_stub", args: { path: "e2e-stub.txt", content: "from stub" } },
    () => "apr_new"
  )
  assert.deepEqual(plan, {
    id: "apr_internal",
    action: "replay",
    sdkApprovalId: "apr_stub",
    decision: "deny",
    approved: false,
    reason: undefined
  })
})

test("SDK 重发已决 id 但 args 不同：fail closed", () => {
  const existing = decidedRow({ decision: "allow", sdkApproved: 1 })
  const plan = planRememberApproval(
    existing,
    { sdkApprovalId: "apr_stub", args: { path: "other.txt", content: "changed" } },
    () => "apr_new"
  )
  assert.equal(plan.action, "fail_closed")
  if (plan.action === "fail_closed") assert.equal(plan.cause, "args_mismatch")
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
})

test("没发过 SDK response 的已决 id：fail closed", () => {
  const plan = planRememberApproval(
    decidedRow({ decision: "allow", sdkApproved: null }),
    { sdkApprovalId: "apr_stub", args: { path: "e2e-stub.txt", content: "from stub" } },
    () => "apr_new"
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
    { sdkApprovalId: "apr_stub", args: { observationId: "obs_1", action: "click" } },
    () => "apr_new"
  )
  assert.equal(plan.action, "fail_closed")
  if (plan.action === "fail_closed") assert.equal(plan.cause, "desktop_act_allow")
})

test("落库 SDK response 后带 resumeCode 不得回放 true", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertApproval(db, decidedRow({ decision: "allow", sdkApproved: null }))
  setApprovalSdkResponse(db, "apr_internal", {
    approved: false,
    reason: "stale_observation",
    resumeCode: "stale_observation"
  })
  const row = getApprovalBySdkIdentity(db, {
    sdkApprovalId: "apr_stub",
    runId: "run_1",
    toolCallId: "tool_stub"
  })
  const plan = planRememberApproval(row, {
    sdkApprovalId: "apr_stub",
    args: { path: "e2e-stub.txt", content: "from stub" }
  }, () => "apr_new")
  assert.equal(plan.action, "fail_closed")
  if (plan.action === "fail_closed") assert.equal(plan.cause, "resume_code")
})
