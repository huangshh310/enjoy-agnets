/**
 * fail-closed 先处理孤儿：不发卡，Inbox 拍板数不涨，库里不留未决。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { insertApproval, insertRun, listPendingApprovals } from "@enjoy-agents/db"

const {
  countPendingApprovalsForSession,
  deleteActiveRun,
  getActiveRun,
  getDatabase,
  getRun,
  holdAgentRun,
  RESTORE_NO_MATCHING_CODE,
  restoreHeldWaitingApprovals
} = await import("./restore-waiting-approvals.behavior.load.ts")

type SentEvent = { type: string; approvalId?: string; message?: string; code?: string }

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

test("fail-closed：先处理孤儿，Inbox 拍板数不变、不留死卡", () => {
  const runId = "run_dead_card"
  const sessionId = "ses_dead_card"
  const events: SentEvent[] = []
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_dead_card", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_dead_card", "dead", 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_dead_card",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertApproval(db, {
    id: "apr_keep_card",
    runId,
    toolCallId: "tool_keep_card",
    name: "write_file",
    args: JSON.stringify({ path: "note.txt" }),
    hmac: "h",
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: "apr_sdk_keep_card"
  })
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_dead_card",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const cardsBefore = events.filter((event) => event.type === "approval.required").length
  const restored = restoreHeldWaitingApprovals({
    runId,
    hmacPending: listPendingApprovals(db, runId),
    items: [
      { approvalId: "apr_keep_card", toolCallId: "tool_keep_card", name: "write_file" },
      { approvalId: "apr_ghost_card", toolCallId: "tool_ghost_card", name: "write_file" }
    ],
    window: recordWindow(events)
  })
  assert.equal(restored.ended, true)
  assert.equal(restored.keep.length, 0)
  assert.equal(events.filter((event) => event.type === "approval.required").length, cardsBefore)
  assert.equal(listPendingApprovals(db, runId).length, 0)
  assert.equal(countPendingApprovalsForSession(sessionId), 0)
  assert.equal(getActiveRun(runId), undefined)
  assert.equal(getRun(db, runId)?.status, "failed")
  assert.equal(getRun(db, runId)?.error, RESTORE_NO_MATCHING_CODE)
  assert.ok(events.some((event) => event.type === "run.error" && event.code === RESTORE_NO_MATCHING_CODE))
  deleteActiveRun(runId)
})

test("superseded 跳过后补发替换行，并并入检查点没有的 HMAC 未决", () => {
  const runId = "run_repark_merge"
  const sessionId = "ses_repark_merge"
  const events: SentEvent[] = []
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_repark_merge", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_repark_merge", "repark", 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_repark_merge",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  insertApproval(db, {
    id: "apr_old_superseded",
    runId,
    toolCallId: "tool_repark",
    name: "write_file",
    args: JSON.stringify({ path: "old.txt" }),
    hmac: "h",
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: "superseded:apr_old_superseded"
  })
  insertApproval(db, {
    id: "apr_replacement",
    runId,
    toolCallId: "tool_repark",
    name: "write_file",
    args: JSON.stringify({ path: "new.txt" }),
    hmac: "h2",
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: "apr_sdk_repark"
  })
  insertApproval(db, {
    id: "apr_extra_hmac",
    runId,
    toolCallId: "tool_extra",
    name: "write_file",
    args: JSON.stringify({ path: "extra.txt" }),
    hmac: "h3",
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: "apr_sdk_extra"
  })
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_repark_merge",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const restored = restoreHeldWaitingApprovals({
    runId,
    hmacPending: listPendingApprovals(db, runId),
    items: [{ approvalId: "apr_old_superseded", toolCallId: "tool_repark", name: "write_file" }],
    window: recordWindow(events)
  })
  assert.equal(restored.ended, false)
  assert.deepEqual(
    restored.keep.map((item) => item.approvalId).sort(),
    ["apr_extra_hmac", "apr_replacement"]
  )
  const cards = events.filter((event) => event.type === "approval.required")
  assert.equal(cards.length, 2)
  assert.ok(cards.some((event) => event.approvalId === "apr_replacement"))
  assert.ok(cards.some((event) => event.approvalId === "apr_extra_hmac"))
  deleteActiveRun(runId)
})
