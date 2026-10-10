/**
 * 回挂取消路径结清未决；已结束 run 的 NULL 行不再进 Inbox。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { getApproval, insertApproval, insertRun, listLivePendingApprovals } from "@enjoy-agents/db"

const { abandonWaitingRestore, deleteActiveRun, getDatabase, getRun, holdAgentRun } = await import(
  "./restore-waiting-runs.behavior.load.ts"
)

function silentWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: { send() {} }
  } as unknown as BrowserWindow
}

test("回挂取消结清未决：cancelled run 的 NULL 行不进拍板", () => {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_abandon", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ses_abandon", "ws_abandon", "abandon", 1, 1)
  insertRun(db, {
    id: "run_abandon",
    sessionId: "ses_abandon",
    workspaceId: "ws_abandon",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertApproval(db, {
    id: "apr_abandon",
    runId: "run_abandon",
    toolCallId: "tool_abandon",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: null,
    createdAt: 1
  })
  insertApproval(db, {
    id: "apr_abandon_kept",
    runId: "run_abandon",
    toolCallId: "tool_kept",
    name: "write_file",
    args: "{}",
    hmac: "h2",
    decision: "allow",
    createdAt: 2
  })
  holdAgentRun({
    runId: "run_abandon",
    window: silentWindow(),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: "ses_abandon",
      workspaceId: "ws_abandon",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  abandonWaitingRestore("run_abandon", silentWindow(), {
    status: "cancelled",
    error: "Missing generation checkpoint.",
    cause: "aborted"
  })
  assert.equal(getApproval(db, "apr_abandon")?.decision, "cancelled")
  assert.equal(getApproval(db, "apr_abandon_kept")?.decision, "allow")
  assert.equal(getRun(db, "run_abandon")?.status, "cancelled")
  assert.ok(!listLivePendingApprovals(db).some((item) => item.id === "apr_abandon"))
  deleteActiveRun("run_abandon")
})
