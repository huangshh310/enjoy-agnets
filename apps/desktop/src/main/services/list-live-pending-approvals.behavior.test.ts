/**
 * Inbox 拍板真源：decision IS NULL 且未归档；已决 / 归档不进。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { insertApproval, insertRun, listLivePendingApprovals } from "@enjoy-agents/db"

const { getDatabase } = await import("./settle-run-approvals.behavior.load.ts")

test("活会话未决进列表，已决与归档不进", () => {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_pending_sot", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ses_live_sot", "ws_pending_sot", "活着", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("ses_arch_sot", "ws_pending_sot", "归档", 1, 1, 9)
  insertRun(db, {
    id: "run_live_sot",
    sessionId: "ses_live_sot",
    workspaceId: "ws_pending_sot",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertRun(db, {
    id: "run_arch_sot",
    sessionId: "ses_arch_sot",
    workspaceId: "ws_pending_sot",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertApproval(db, {
    id: "apr_live_sot",
    runId: "run_live_sot",
    toolCallId: "tool_live",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: null,
    createdAt: 2
  })
  insertApproval(db, {
    id: "apr_done_sot",
    runId: "run_live_sot",
    toolCallId: "tool_done",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: "allow",
    createdAt: 3
  })
  insertApproval(db, {
    id: "apr_arch_sot",
    runId: "run_arch_sot",
    toolCallId: "tool_arch",
    name: "write_file",
    args: "{}",
    hmac: "h",
    decision: null,
    createdAt: 4
  })
  const items = listLivePendingApprovals(db)
  assert.ok(items.some((item) => item.id === "apr_live_sot" && item.sessionId === "ses_live_sot"))
  assert.ok(!items.some((item) => item.id === "apr_done_sot"))
  assert.ok(!items.some((item) => item.id === "apr_arch_sot"))
})
