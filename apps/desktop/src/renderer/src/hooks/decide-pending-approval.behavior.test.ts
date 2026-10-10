/**
 * 回挂卡在 reattach 前点允许：走 decidePendingApproval，禁止红条。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { APPROVAL_NOT_REATTACHED } from "@enjoy-agents/ipc-contract/approval-decide"
import {
  decidePendingApproval,
  pendingApprovalErrorForTest,
  resetPendingApprovalForTest,
  seedPendingApprovalForTest
} from "./decide-pending-approval.ts"

test("reattach 前点允许：decidePendingApproval 不写红条", async () => {
  const previous = (globalThis as { window?: unknown }).window
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      agent: {
        decide: async () => {
          throw new Error(`Error invoking remote method 'agent.decide': Error: ${APPROVAL_NOT_REATTACHED}`)
        }
      }
    }
  }
  seedPendingApprovalForTest({
    runId: "run_reattach",
    toolCallId: "tool_reattach",
    approvalId: "apr_reattach"
  })
  try {
    await decidePendingApproval("allow")
    assert.equal(pendingApprovalErrorForTest(), null)
  } finally {
    ;(globalThis as { window?: unknown }).window = previous
    resetPendingApprovalForTest()
  }
})

test("其它 decide 失败仍写人话红条", async () => {
  const previous = (globalThis as { window?: unknown }).window
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      agent: {
        decide: async () => {
          throw new Error("Approval token was tampered.")
        }
      }
    }
  }
  seedPendingApprovalForTest({
    runId: "run_hmac",
    toolCallId: "tool_hmac",
    approvalId: "apr_hmac"
  })
  try {
    await decidePendingApproval("allow")
    const error = pendingApprovalErrorForTest()
    assert.ok(error)
    assert.doesNotMatch(error, /Error invoking remote method/)
    assert.notEqual(error, APPROVAL_NOT_REATTACHED)
  } finally {
    ;(globalThis as { window?: unknown }).window = previous
    resetPendingApprovalForTest()
  }
})
