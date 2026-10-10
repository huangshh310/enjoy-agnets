/**
 * Stop 中止：未决审批写 cancelled，推 approval.resolved，工具行已停止。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertRun, listPendingApprovals, setApprovalDecision, setApprovalSdkResponse } from "@enjoy-agents/db"

const {
  rememberApproval,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  getDatabase,
  getApproval,
  abortActiveRunMemory,
  failAgentPump,
  settlePendingApprovalsForRun
} = await import("./settle-run-approvals.behavior.load.ts")

type SentEvent = { type: string; decision?: string; toolCallId?: string; code?: string }

function recordWindow(events: SentEvent[]): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: {
      send(_ch: string, event: SentEvent) {
        events.push(event)
      }
    }
  } as unknown as BrowserWindow
}

function seedSession(sessionId: string, runId: string): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_stop", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_stop", "to stop", 1, 1)
  try {
    insertRun(db, {
      id: runId,
      sessionId,
      workspaceId: "ws_stop",
      kind: "agent",
      status: "waiting_review",
      modelId: "m",
      providerId: null,
      checkpoint: null,
      error: null
    })
  } catch {
    // 同行已在
  }
}

test("Stop：卡片未批就中止，库写 cancelled，Inbox 不因审批残留涨数", async () => {
  const runId = "run_stop_settle"
  const sessionId = "ses_stop_settle"
  const events: SentEvent[] = []
  seedSession(sessionId, runId)
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_stop",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  run.pumping = true
  run.tools = [
    {
      id: "tool_stop",
      name: "write_file",
      state: "approval-requested",
      args: { path: "slow-note.txt" }
    }
  ]
  rememberApproval({
    runId,
    approvalId: "apr_stop_settle",
    toolCallId: "tool_stop",
    name: "write_file",
    args: { path: "slow-note.txt", content: "x" }
  })
  run.pendingApprovals.push({
    approvalId: "apr_stop_settle",
    toolCallId: "tool_stop",
    name: "write_file",
    args: { path: "slow-note.txt", content: "x" }
  })
  assert.equal(listPendingApprovals(getDatabase(), runId).length, 1)

  abortActiveRunMemory(runId)
  const stored = getApproval(getDatabase(), "apr_stop_settle")
  assert.equal(stored?.decision, "cancelled")
  assert.equal(stored?.sdkApproved, 0)
  assert.equal(stored?.sdkReason, "run_stopped")
  assert.equal(listPendingApprovals(getDatabase(), runId).length, 0)
  assert.ok(events.some((event) => event.type === "approval.resolved" && event.decision === "cancelled"))
  const tool = run.tools[0]
  assert.equal(tool?.state, "output-error")
  assert.equal((tool?.result as { decision?: string; code?: string } | undefined)?.decision, "cancelled")
  assert.equal((tool?.result as { code?: string } | undefined)?.code, "user_aborted")
  deleteActiveRun(runId)
})

test("泵真实出错结清：码是 run_failed，不是 user_aborted / 已停止", async () => {
  const runId = "run_fail_settle"
  const sessionId = "ses_fail_settle"
  const events: SentEvent[] = []
  seedSession(sessionId, runId)
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_stop",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  run.pumping = true
  run.tools = [
    {
      id: "tool_fail",
      name: "write_file",
      state: "approval-requested",
      args: { path: "fail-note.txt" }
    }
  ]
  rememberApproval({
    runId,
    approvalId: "apr_fail_settle",
    toolCallId: "tool_fail",
    name: "write_file",
    args: { path: "fail-note.txt", content: "x" }
  })
  run.pendingApprovals.push({
    approvalId: "apr_fail_settle",
    toolCallId: "tool_fail",
    name: "write_file",
    args: { path: "fail-note.txt", content: "x" }
  })
  await failAgentPump(runId, run, new Error("provider exploded"))
  const stored = getApproval(getDatabase(), "apr_fail_settle")
  assert.equal(stored?.decision, "cancelled")
  assert.equal(stored?.sdkApproved, 0)
  assert.equal(stored?.sdkReason, "run_failed")
  assert.equal((run.tools[0]?.result as { code?: string } | undefined)?.code, "run_failed")
  assert.notEqual((run.tools[0]?.result as { code?: string } | undefined)?.code, "user_aborted")
  assert.ok(events.some((event) => event.type === "approval.resolved" && event.code === "run_failed"))
  assert.ok(events.some((event) => event.type === "run.error" && event.code !== "user_aborted"))
})

test("fail-closed 结清不覆盖已决行，审计字段原样", () => {
  const runId = "run_keep_decided"
  const sessionId = "ses_keep_decided"
  const events: SentEvent[] = []
  seedSession(sessionId, runId)
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_stop",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  rememberApproval({
    runId,
    approvalId: "apr_keep_decided",
    toolCallId: "tool_keep",
    name: "write_file",
    args: { path: "kept.txt", content: "x" }
  })
  setApprovalDecision(getDatabase(), "apr_keep_decided", "allow")
  setApprovalSdkResponse(getDatabase(), "apr_keep_decided", { approved: true, reason: "user-allow" })
  run.pendingApprovals.push({
    approvalId: "apr_keep_decided",
    toolCallId: "tool_keep",
    name: "write_file",
    args: { path: "kept.txt", content: "x" }
  })
  const settled = settlePendingApprovalsForRun(runId, recordWindow(events), "failed")
  assert.equal(settled, 0)
  const stored = getApproval(getDatabase(), "apr_keep_decided")
  assert.equal(stored?.decision, "allow")
  assert.equal(stored?.sdkApproved, 1)
  assert.equal(stored?.sdkReason, "user-allow")
  assert.equal(run.pendingApprovals.length, 0)
  assert.ok(!events.some((event) => event.type === "approval.resolved" && event.decision === "cancelled"))
  deleteActiveRun(runId)
})

test("failAgentPump 用户取消走 aborted，不是 run_failed", async () => {
  const runId = "run_user_cancel_pump"
  const sessionId = "ses_user_cancel_pump"
  const events: SentEvent[] = []
  seedSession(sessionId, runId)
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_stop",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  run.pumping = true
  run.userCancelled = true
  run.tools = [
    {
      id: "tool_cancel_pump",
      name: "write_file",
      state: "approval-requested",
      args: { path: "cancel-note.txt" }
    }
  ]
  rememberApproval({
    runId,
    approvalId: "apr_cancel_pump",
    toolCallId: "tool_cancel_pump",
    name: "write_file",
    args: { path: "cancel-note.txt", content: "x" }
  })
  run.pendingApprovals.push({
    approvalId: "apr_cancel_pump",
    toolCallId: "tool_cancel_pump",
    name: "write_file",
    args: { path: "cancel-note.txt", content: "x" }
  })
  await failAgentPump(runId, run, new Error("after user stop"))
  const stored = getApproval(getDatabase(), "apr_cancel_pump")
  assert.equal(stored?.decision, "cancelled")
  assert.equal(stored?.sdkApproved, 0)
  assert.equal(stored?.sdkReason, "run_stopped")
  assert.equal((run.tools[0]?.result as { code?: string } | undefined)?.code, "user_aborted")
  assert.ok(events.some((event) => event.type === "approval.resolved" && event.code === "user_aborted"))
  assert.ok(!events.some((event) => event.type === "approval.resolved" && event.code === "run_failed"))
  assert.ok(!events.some((event) => event.type === "run.error"))
})
