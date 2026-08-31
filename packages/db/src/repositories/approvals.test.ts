import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations } from "../migrations/runner.ts"
import { getApproval, insertApproval, setApprovalDecision } from "./approvals.ts"

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
