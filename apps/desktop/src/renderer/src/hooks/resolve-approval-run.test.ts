import assert from "node:assert/strict"
import test from "node:test"
import { resolveApprovalRunId } from "./resolve-approval-run.ts"

test("优先用审批事件上的 runId，store 空也能提交", () => {
  assert.equal(resolveApprovalRunId({ runId: "run_card" }, null), "run_card")
  assert.equal(resolveApprovalRunId({ runId: "run_card" }, "run_store"), "run_card")
  assert.equal(resolveApprovalRunId(null, "run_store"), "run_store")
  assert.equal(resolveApprovalRunId(null, null), null)
})
