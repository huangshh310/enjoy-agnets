import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations } from "../migrations/runner.ts"
import {
  approvalArgsMatch,
  getApproval,
  insertApproval,
  nextApprovalId,
  planRememberApproval,
  setApprovalDecision
} from "./approvals.ts"

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
  const again = nextApprovalId(pending, { id: "apr_fixed", runId: "run_1", toolCallId: "tool_1" }, () => "apr_new")
  assert.deepEqual(again, { id: "apr_fixed", action: "reuse" })
  const afterDeny = nextApprovalId(
    { ...pending, decision: "deny" },
    { id: "apr_fixed", runId: "run_1", toolCallId: "tool_1" },
    () => "apr_new"
  )
  assert.deepEqual(afterDeny, { id: "apr_fixed", action: "decided" })
  const otherTool = nextApprovalId(
    pending,
    { id: "apr_fixed", runId: "run_1", toolCallId: "tool_other" },
    () => "apr_other"
  )
  assert.deepEqual(otherTool, { id: "apr_other", action: "insert" })
})

test("SDK 重发已拒绝 id：args 一致则回放原决定", () => {
  const existing = {
    id: "apr_stub",
    runId: "run_1",
    toolCallId: "tool_stub",
    name: "write_file",
    args: JSON.stringify({ path: "e2e-stub.txt", content: "from stub" }),
    hmac: "x",
    decision: "deny",
    createdAt: 1
  }
  const plan = planRememberApproval(
    existing,
    {
      id: "apr_stub",
      runId: "run_1",
      toolCallId: "tool_stub",
      args: { path: "e2e-stub.txt", content: "from stub" }
    },
    () => "apr_new"
  )
  assert.deepEqual(plan, { id: "apr_stub", action: "replay", decision: "deny" })
})

test("SDK 重发已决 id 但 args 不同：fail closed", () => {
  const existing = {
    id: "apr_stub",
    runId: "run_1",
    toolCallId: "tool_stub",
    name: "write_file",
    args: JSON.stringify({ path: "e2e-stub.txt", content: "from stub" }),
    hmac: "x",
    decision: "allow",
    createdAt: 1
  }
  const plan = planRememberApproval(
    existing,
    {
      id: "apr_stub",
      runId: "run_1",
      toolCallId: "tool_stub",
      args: { path: "other.txt", content: "changed" }
    },
    () => "apr_new"
  )
  assert.deepEqual(plan, { id: "apr_stub", action: "fail_closed", decision: "allow" })
  assert.equal(approvalArgsMatch(existing.args, { path: "other.txt" }), false)
})
