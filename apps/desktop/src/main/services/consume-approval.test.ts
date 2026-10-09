import assert from "node:assert/strict"
import { test } from "node:test"
import { planRememberApproval } from "@enjoy-agents/db"
import {
  APPROVAL_ARGS_MISMATCH,
  APPROVAL_ARGS_MISMATCH_COPY,
  applyRememberedApproval
} from "./consume-approval.ts"
import { approvalResponseMessage } from "./approval-response-message.ts"

const deniedRow = {
  id: "apr_stub",
  runId: "run_1",
  toolCallId: "tool_stub",
  name: "write_file",
  args: JSON.stringify({ path: "e2e-stub.txt", content: "from stub" }),
  hmac: "x",
  decision: "deny",
  createdAt: 1
}

test("SDK 重发已拒绝 id：不开新卡，带原 id 回应 deny", () => {
  const plan = planRememberApproval(
    deniedRow,
    {
      id: "apr_stub",
      runId: "run_1",
      toolCallId: "tool_stub",
      args: { path: "e2e-stub.txt", content: "from stub" }
    },
    () => "apr_new"
  )
  const applied = applyRememberedApproval(plan, {
    toolCallId: "tool_stub",
    name: "write_file",
    args: { path: "e2e-stub.txt", content: "from stub" }
  })
  assert.equal(applied.kind, "replay")
  if (applied.kind !== "replay") return
  assert.equal(applied.approvalId, "apr_stub")
  assert.equal(applied.approved, false)
  assert.equal(applied.decision, "deny")
  const message = approvalResponseMessage({
    approvalId: applied.approvalId,
    approved: applied.approved
  })
  const part = Array.isArray(message.content) ? message.content[0] : undefined
  assert.deepEqual(part, {
    type: "tool-approval-response",
    approvalId: "apr_stub",
    approved: false,
    reason: undefined
  })
})

test("SDK 重发已决 id 但 args 不同：按 fail closed 处理", () => {
  const plan = planRememberApproval(
    { ...deniedRow, decision: "allow" },
    {
      id: "apr_stub",
      runId: "run_1",
      toolCallId: "tool_stub",
      args: { path: "changed.txt", content: "nope" }
    },
    () => "apr_new"
  )
  const applied = applyRememberedApproval(plan, {
    toolCallId: "tool_stub",
    name: "write_file",
    args: { path: "changed.txt", content: "nope" }
  })
  assert.equal(applied.kind, "fail_closed")
  if (applied.kind !== "fail_closed") return
  assert.equal(applied.approvalId, "apr_stub")
  assert.equal(applied.code, APPROVAL_ARGS_MISMATCH)
  assert.equal(applied.message, APPROVAL_ARGS_MISMATCH_COPY)
  const message = approvalResponseMessage({
    approvalId: applied.approvalId,
    approved: false,
    reason: applied.code
  })
  const part = Array.isArray(message.content) ? message.content[0] : undefined
  assert.equal((part as { approvalId?: string }).approvalId, "apr_stub")
  assert.equal((part as { approved?: boolean }).approved, false)
  assert.equal((part as { reason?: string }).reason, APPROVAL_ARGS_MISMATCH)
})
