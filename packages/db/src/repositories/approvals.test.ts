import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations } from "../migrations/runner.ts"
import {
  approvalArgsMatch,
  canonicalizeJson,
  getApproval,
  getApprovalByRunAndSdkId,
  getApprovalBySdkIdentity,
  insertApproval,
  migrateApprovalForRepark,
  nextApprovalId,
  planRememberApproval,
  planSameRunSdkCollision,
  resolvedSdkApprovalId,
  setApprovalDecision,
  setApprovalSdkResponse,
  supersededSdkApprovalId
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

test("旧行 sdk_approval_id 为 NULL：按内部 id 当作 SDK id", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertApproval(db, decidedRow({ id: "apr_legacy", sdkApprovalId: "apr_legacy" }))
  db.prepare("UPDATE approvals SET sdk_approval_id = NULL WHERE id = ?").run("apr_legacy")
  const row = getApproval(db, "apr_legacy")
  assert.equal(row?.sdkApprovalId, null)
  assert.equal(resolvedSdkApprovalId(row!), "apr_legacy")
  assert.equal(
    getApprovalBySdkIdentity(db, {
      sdkApprovalId: "apr_legacy",
      runId: "run_1",
      toolCallId: "tool_stub"
    })?.id,
    "apr_legacy"
  )
})

test("同一 run、同一 toolCall、同一 SDK id：UNIQUE 拒绝第二行", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertApproval(db, decidedRow())
  assert.throws(() => {
    insertApproval(db, decidedRow({ id: "apr_other" }))
  })
})

test("同一 run 内 SDK id 对应不同 toolCall：碰撞计划是 fail closed", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertApproval(db, decidedRow())
  const colliding = getApprovalByRunAndSdkId(db, { runId: "run_1", sdkApprovalId: "apr_stub" })
  assert.equal(colliding?.toolCallId, "tool_stub")
  const plan = planSameRunSdkCollision("apr_stub")
  assert.equal(plan.action, "fail_closed")
  if (plan.action === "fail_closed") assert.equal(plan.cause, "sdk_id_collision")
  assert.equal(plan.sdkApprovalId, "apr_stub")
})

test("repark 迁走 sdk_approval_id，回放只命中新行", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  insertApproval(
    db,
    decidedRow({
      id: "apr_stub",
      sdkApprovalId: "apr_stub",
      name: "desktop_act",
      decision: "allow",
      sdkApproved: null
    })
  )
  const migrated = migrateApprovalForRepark(db, {
    existingId: "apr_stub",
    nextId: "apr_second",
    name: "desktop_act",
    args: JSON.stringify({ observationId: "obs_2" }),
    hmac: "new-hmac",
    createdAt: 2
  })
  assert.equal(migrated.id, "apr_second")
  assert.equal(migrated.sdkApprovalId, "apr_stub")
  const old = getApproval(db, "apr_stub")
  assert.equal(old?.sdkApprovalId, supersededSdkApprovalId("apr_stub"))
  assert.equal(old?.hmac, "")
  assert.equal(old?.decision, "allow")
  const active = getApprovalBySdkIdentity(db, {
    sdkApprovalId: "apr_stub",
    runId: "run_1",
    toolCallId: "tool_stub"
  })
  assert.equal(active?.id, "apr_second")
  assert.equal(active?.sdkApprovalId, "apr_stub")
  assert.equal(
    getApprovalBySdkIdentity(db, {
      sdkApprovalId: supersededSdkApprovalId("apr_stub"),
      runId: "run_1",
      toolCallId: "tool_stub"
    }),
    undefined
  )
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
