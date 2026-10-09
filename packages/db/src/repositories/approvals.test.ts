import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations } from "../migrations/runner.ts"
import { getApproval, insertApproval, nextApprovalId, setApprovalDecision } from "./approvals.ts"

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

test("同一未决审批幂等复用 id，已决后换新 id", () => {
  const pending = { id: "apr_fixed", runId: "run_1", toolCallId: "tool_1", decision: null }
  const again = nextApprovalId(pending, { id: "apr_fixed", runId: "run_1", toolCallId: "tool_1" }, () => "apr_new")
  assert.deepEqual(again, { id: "apr_fixed", action: "reuse" })
  const afterDeny = nextApprovalId(
    { ...pending, decision: "deny" },
    { id: "apr_fixed", runId: "run_1", toolCallId: "tool_1" },
    () => "apr_new"
  )
  assert.deepEqual(afterDeny, { id: "apr_new", action: "insert" })
  const otherTool = nextApprovalId(
    pending,
    { id: "apr_fixed", runId: "run_1", toolCallId: "tool_other" },
    () => "apr_other"
  )
  assert.deepEqual(otherTool, { id: "apr_other", action: "insert" })
})
