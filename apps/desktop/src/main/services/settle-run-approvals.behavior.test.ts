/**
 * Stop 中止：未决审批写 cancelled，推 approval.resolved，工具行已停止。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertRun, listPendingApprovals } from "@enjoy-agents/db"

const {
  rememberApproval,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  getDatabase,
  getApproval,
  abortActiveRunMemory
} = await import("./settle-run-approvals.behavior.load.ts")

type SentEvent = { type: string; decision?: string; toolCallId?: string }

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
