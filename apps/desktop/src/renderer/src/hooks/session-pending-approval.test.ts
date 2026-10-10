import assert from "node:assert/strict"
import { test } from "node:test"
import type { AttentionApproval, AttentionItem } from "../stores/attention/attention.types.ts"
import { findSessionPendingApproval } from "./session-pending-approval.ts"

function approval(runId = "run_1"): AttentionApproval {
  return {
    type: "approval.required",
    runId,
    toolCallId: "tc_1",
    approvalId: "apr_1",
    name: "bash",
    args: { command: "ls" }
  }
}

function slot(partial: Partial<AttentionItem> & Pick<AttentionItem, "id" | "sessionId">): AttentionItem {
  return {
    sessionTitle: "对话",
    kind: "pending_approval",
    status: "active",
    runId: "run_1",
    occurredAt: 1,
    summary: "待审批",
    approval: approval(),
    ...partial
  }
}

test("当前会话读前台 pendingApproval", () => {
  const hit = findSessionPendingApproval({
    sessionId: "s1",
    foregroundSessionId: "s1",
    foregroundRunId: "run_fg",
    foregroundPending: approval("run_fg")
  })
  assert.equal(hit?.source, "foreground")
  assert.equal(hit?.runId, "run_fg")
})

test("后台会话读 park，再读 Attention 槽", () => {
  const fromPark = findSessionPendingApproval({
    sessionId: "s2",
    foregroundSessionId: "s1",
    foregroundRunId: "run_fg",
    foregroundPending: approval("run_fg"),
    park: { pendingApproval: approval("run_park"), runId: "run_park" }
  })
  assert.equal(fromPark?.source, "park")
  assert.equal(fromPark?.runId, "run_park")

  const fromSlot = findSessionPendingApproval({
    sessionId: "s3",
    foregroundSessionId: "s1",
    foregroundRunId: null,
    foregroundPending: null,
    attention: [slot({ id: "s3:pending_approval", sessionId: "s3" })]
  })
  assert.equal(fromSlot?.source, "attention")
})

test("没有未决审批则不确认", () => {
  assert.equal(
    findSessionPendingApproval({
      sessionId: "s9",
      foregroundSessionId: "s1",
      foregroundRunId: null,
      foregroundPending: null,
      attention: [slot({ id: "s1:pending_approval", sessionId: "s1" })]
    }),
    null
  )
})
