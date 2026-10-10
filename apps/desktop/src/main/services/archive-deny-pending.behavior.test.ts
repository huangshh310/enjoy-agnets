/**
 * 归档会话前走普通 deny：清掉未决审批，并回 deniedApprovals。
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
  archiveSession,
  denyPendingApprovalsForSession
} = await import("./archive-deny-pending.behavior.load.ts")

type SentEvent = { type: string; decision?: string; turn?: { attention?: string }; sessionId?: string }

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

function seedSession(sessionId: string): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_archive", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_archive", "to archive", 1, 1)
}

test("归档带未决审批的会话：走 deny，清 pending，回 deniedApprovals", async () => {
  const runId = "run_archive_deny"
  const sessionId = "ses_archive_deny"
  const events: SentEvent[] = []
  seedSession(sessionId)
  try {
    insertRun(getDatabase(), {
      id: runId,
      sessionId,
      workspaceId: "ws_archive",
      kind: "agent",
      status: "waiting_review",
      modelId: "m",
      providerId: null,
      checkpoint: null,
      error: null
    })
  } catch {
    // 同进程可能已有这一行。
  }
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_archive",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  // 本测只验归档 deny，不续泵。
  run.pumping = true
  rememberApproval({
    runId,
    approvalId: "apr_archive_deny",
    toolCallId: "tool_archive",
    name: "write_file",
    args: { path: "note.txt", content: "x" }
  })
  run.pendingApprovals.push({
    approvalId: "apr_archive_deny",
    toolCallId: "tool_archive",
    name: "write_file",
    args: { path: "note.txt", content: "x" }
  })
  assert.equal(listPendingApprovals(getDatabase(), runId).length, 1)

  const result = await archiveSession(sessionId, run.window)
  assert.equal(result.deniedApprovals, 1)
  assert.equal(listPendingApprovals(getDatabase(), runId).length, 0)
  assert.equal(getActiveRun(runId), undefined)
  assert.ok(events.some((event) => event.type === "approval.resolved" && event.decision === "deny"))
  const abortEvent = events.find((event) => event.type === "run.error")
  assert.equal(abortEvent?.turn?.attention, "neutral")
  assert.equal(abortEvent?.sessionId, sessionId)
  const stored = getApproval(getDatabase(), "apr_archive_deny")
  assert.equal(stored?.decision, "deny")
  assert.equal(stored?.sdkApproved, 0)
  deleteActiveRun(runId)
})

test("活泵还在且 decide 失败：归档不绕过 denyStored", async () => {
  const runId = "run_archive_live_fail"
  const sessionId = "ses_archive_live_fail"
  seedSession(sessionId)
  holdAgentRun({
    runId,
    window: recordWindow([]),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_archive",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  run.pumping = true
  rememberApproval({
    runId,
    approvalId: "apr_archive_live_fail",
    toolCallId: "tool_archive_live",
    name: "write_file",
    args: { path: "note.txt" }
  })
  run.pendingApprovals.push({
    approvalId: "apr_archive_live_fail",
    toolCallId: "tool_wrong",
    name: "write_file",
    args: { path: "note.txt" }
  })
  await assert.rejects(
    () => denyPendingApprovalsForSession(sessionId, run.window),
    /tampered|no longer active|No matching/i
  )
  assert.ok(getActiveRun(runId))
  deleteActiveRun(runId)
})
