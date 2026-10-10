/**
 * will-quit 写检查点抛错：结清走 restart，sdk_reason 不得丢。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertRun } from "@enjoy-agents/db"

const {
  deleteActiveRun,
  flushActiveRuns,
  getActiveRun,
  getApproval,
  getDatabase,
  getRun,
  holdAgentRun,
  rememberApproval
} = await import("./flush-agent-run.behavior.load.ts")

function silentWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: { send() {} }
  } as unknown as BrowserWindow
}

function seedWaitingRun(runId: string, sessionId: string, approvalId: string): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_flush_quit", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_flush_quit", "flush quit", 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_flush_quit",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  holdAgentRun({
    runId,
    window: silentWindow(),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_flush_quit",
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
    approvalId,
    toolCallId: `tool_${approvalId}`,
    name: "write_file",
    args: { path: "quit.txt", content: "x" }
  })
  run.pendingApprovals.push({
    approvalId,
    toolCallId: `tool_${approvalId}`,
    name: "write_file",
    args: { path: "quit.txt", content: "x" }
  })
}

test("will-quit 持久化抛错：cancelled + sdk_reason=restart + 回挂码", () => {
  const runId = "run_flush_quit_throw"
  const approvalId = "apr_flush_quit_throw"
  seedWaitingRun(runId, "ses_flush_quit_throw", approvalId)
  flushActiveRuns({
    failClosed: true,
    persistWaiting: () => {
      throw new Error("persist waiting failed")
    }
  })
  const stored = getApproval(getDatabase(), approvalId)
  assert.equal(stored?.decision, "cancelled")
  assert.equal(stored?.sdkReason, "restart")
  assert.equal(getRun(getDatabase(), runId)?.status, "cancelled")
  assert.equal(getRun(getDatabase(), runId)?.error, "restore_no_matching_approval")
  deleteActiveRun(runId)
})
