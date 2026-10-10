/**
 * 启动回挂：没检查点则结清停止；HMAC+检查点+签参才回挂可决策卡。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertRun } from "@enjoy-agents/db"

const {
  APPROVAL_RESTART_REASON,
  getApproval,
  getDatabase,
  getRun,
  listLivePendingApprovals,
  rememberApproval,
  resetRestoreWaitingOnceForTests,
  restoreWaitingRuns,
  RESTORE_NO_MATCHING_CODE,
  deleteActiveRun,
  getActiveRun
} = await import("./restore-waiting-runs.behavior.load.ts")

type SentEvent = { type: string; approvalId?: string; code?: string; message?: string }

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

function seedWaiting(input: {
  runId: string
  sessionId: string
  workspaceId: string
  approvalId: string
  checkpoint: string | null
}): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(input.workspaceId, "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(input.sessionId, input.workspaceId, "restart", 1, 1)
  insertRun(db, {
    id: input.runId,
    sessionId: input.sessionId,
    workspaceId: input.workspaceId,
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: input.checkpoint,
    error: null
  })
  const plan = rememberApproval({
    runId: input.runId,
    approvalId: input.approvalId,
    toolCallId: `tool_${input.approvalId}`,
    name: "write_file",
    args: { path: "note.txt", content: "from stub" }
  })
  if (plan.action !== "insert" && plan.action !== "reuse") {
    throw new Error(`rememberApproval failed: ${plan.action}`)
  }
}

function waitingCheckpoint(input: { sessionId: string; approvalId: string }): string {
  return JSON.stringify({
    version: 1,
    request: {
      kind: "agent",
      sessionId: input.sessionId,
      modelId: "m",
      messages: [{ role: "user", content: "please write a note" }]
    },
    pendingApprovals: [
      { approvalId: input.approvalId, toolCallId: `tool_${input.approvalId}`, name: "write_file" }
    ]
  })
}

test("模拟重启无检查点：未决 cancelled(restart)，run 停止，Inbox 空", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_restart_nocheck"
  const sessionId = "ses_restart_nocheck"
  const approvalId = "apr_restart_nocheck"
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_restart_nocheck",
    approvalId,
    checkpoint: null
  })
  await restoreWaitingRuns(recordWindow(events))
  const stored = getApproval(getDatabase(), approvalId)
  assert.equal(stored?.decision, "cancelled")
  assert.equal(stored?.sdkReason, APPROVAL_RESTART_REASON)
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled")
  assert.equal(getRun(getDatabase(), runId)?.error, RESTORE_NO_MATCHING_CODE)
  assert.equal(getActiveRun(runId), undefined)
  assert.ok(!listLivePendingApprovals(getDatabase()).some((item) => item.id === approvalId))
  assert.ok(
    events.some(
      (event) => event.type === "run.error" && event.code === RESTORE_NO_MATCHING_CODE
    )
  )
  assert.equal(events.some((event) => event.type === "approval.required"), false)
})

test("模拟重启有检查点：HMAC+签参回挂可决策卡，Inbox 仍有活行", async () => {
  resetRestoreWaitingOnceForTests()
  const runId = "run_restart_ckpt"
  const sessionId = "ses_restart_ckpt"
  const approvalId = "apr_restart_ckpt"
  const events: SentEvent[] = []
  seedWaiting({
    runId,
    sessionId,
    workspaceId: "ws_restart_ckpt",
    approvalId,
    checkpoint: waitingCheckpoint({ sessionId, approvalId })
  })
  await restoreWaitingRuns(recordWindow(events))
  const stored = getApproval(getDatabase(), approvalId)
  assert.equal(stored?.decision ?? null, null)
  assert.equal(getRun(getDatabase(), runId)?.status, "waiting_review")
  assert.ok(events.some((event) => event.type === "approval.required" && event.approvalId === approvalId))
  assert.ok(listLivePendingApprovals(getDatabase()).some((item) => item.id === approvalId))
  assert.ok(getActiveRun(runId))
  deleteActiveRun(runId)
})
