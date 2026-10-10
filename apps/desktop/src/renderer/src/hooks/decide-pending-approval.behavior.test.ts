/**
 * 回挂卡在 reattach 前点允许：走 decidePendingApproval，禁止红条。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { APPROVAL_NOT_REATTACHED } from "@enjoy-agents/ipc-contract/approval-decide"
import { decidePendingApproval } from "./decide-pending-approval.ts"
import { useChatStore } from "../stores/chat-store.ts"

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
  useChatStore.setState({
    pendingApproval: {
      type: "approval.required",
      runId: "run_reattach",
      toolCallId: "tool_reattach",
      approvalId: "apr_reattach",
      name: "write_file",
      args: { path: "a.ts" }
    },
    runId: "run_reattach",
    error: null
  })
  try {
    await decidePendingApproval("allow")
    assert.equal(useChatStore.getState().error, null)
  } finally {
    ;(globalThis as { window?: unknown }).window = previous
    useChatStore.setState({ pendingApproval: null, runId: null, error: null })
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
  useChatStore.setState({
    pendingApproval: {
      type: "approval.required",
      runId: "run_hmac",
      toolCallId: "tool_hmac",
      approvalId: "apr_hmac",
      name: "write_file",
      args: { path: "a.ts" }
    },
    runId: "run_hmac",
    error: null
  })
  try {
    await decidePendingApproval("allow")
    const error = useChatStore.getState().error
    assert.ok(error)
    assert.doesNotMatch(error, /Error invoking remote method/)
    assert.notEqual(error, APPROVAL_NOT_REATTACHED)
  } finally {
    ;(globalThis as { window?: unknown }).window = previous
    useChatStore.setState({ pendingApproval: null, runId: null, error: null })
  }
})
