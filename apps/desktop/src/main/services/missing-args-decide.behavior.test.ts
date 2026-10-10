/**
 * SDK tool-approval-request 可能没有 input；缺 args 归一成 {} 后 HMAC 必须能 decide。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"

const {
  rememberApproval,
  assertApprovalHmac,
  decideApproval,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun
} = await import("./missing-args-decide.behavior.load.ts")

function recordWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: { send() {} }
  } as unknown as BrowserWindow
}

test("缺 args 的审批卡归一成 {} 后能 decide", async () => {
  const runId = "run_missing_args"
  const approvalId = "apr_missing_args"
  const toolCallId = "tool_missing_args"
  rememberApproval({
    runId,
    approvalId,
    toolCallId,
    name: "write_file",
    args: undefined
  })
  assert.doesNotThrow(() => assertApprovalHmac({ runId, approvalId, toolCallId }))

  holdAgentRun({
    runId,
    window: recordWindow(),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: "ses_missing_args",
      workspaceId: "ws_missing_args",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  run.pumping = true
  run.pendingApprovals.push({
    approvalId,
    toolCallId,
    name: "write_file",
    args: {}
  })
  const result = await decideApproval(run.window, {
    runId,
    toolCallId,
    approvalId,
    decision: "deny"
  })
  assert.equal(result.ok, true)
  deleteActiveRun(runId)
})
