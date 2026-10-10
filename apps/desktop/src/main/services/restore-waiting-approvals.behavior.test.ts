/**
 * fail-closed 先处理孤儿：不发卡，Inbox 拍板数不涨，库里不留未决。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { getApproval, insertApproval, insertRun, listPendingApprovals } from "@enjoy-agents/db"

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

type SentEvent = {
  type: string
  approvalId?: string
  message?: string
  code?: string
  allowedBySession?: boolean
  reaskReason?: string
}

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
  const hmacPassed = listPendingApprovals(db, runId).filter(
    (row) => row.id === "apr_replacement" || row.id === "apr_extra_hmac"
  )
  const restored = restoreHeldWaitingApprovals({
    runId,
    hmacPending: hmacPassed,
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
  assert.ok(cards.every((event) => event.reaskReason === "restart"))
  assert.ok(cards.every((event) => event.allowedBySession === false))
  deleteActiveRun(runId)
})

function seedRestoreSession(sessionId: string, runId: string, workspaceId: string): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(workspaceId, "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, workspaceId, sessionId, 1, 1)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId,
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
}

test("HMAC 列表反例：别的 run 的行不进 keep", () => {
  const runId = "run_hmac_other"
  seedRestoreSession("ses_hmac_other", runId, "ws_hmac_other")
  seedRestoreSession("ses_hmac_foreign", "run_hmac_foreign", "ws_hmac_other")
  const db = getDatabase()
  insertApproval(db, {
    id: "apr_hmac_keep",
    runId,
    toolCallId: "tool_keep",
    name: "write_file",
    args: JSON.stringify({ path: "keep.txt" }),
    hmac: "h",
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: "apr_sdk_keep"
  })
  insertApproval(db, {
    id: "apr_hmac_foreign",
    runId: "run_hmac_foreign",
    toolCallId: "tool_foreign",
    name: "write_file",
    args: JSON.stringify({ path: "foreign.txt" }),
    hmac: "h2",
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: "apr_sdk_foreign"
  })
  holdAgentRun({
    runId,
    window: recordWindow([]),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: "ses_hmac_other",
      workspaceId: "ws_hmac_other",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const events: SentEvent[] = []
  const restored = restoreHeldWaitingApprovals({
    runId,
    hmacPending: [getApproval(db, "apr_hmac_keep")!, getApproval(db, "apr_hmac_foreign")!],
    items: [{ approvalId: "apr_hmac_keep", toolCallId: "tool_keep", name: "write_file" }],
    window: recordWindow(events)
  })
  assert.equal(restored.ended, false)
  assert.deepEqual(
    restored.keep.map((item) => item.approvalId),
    ["apr_hmac_keep"]
  )
  assert.equal(events.some((event) => event.approvalId === "apr_hmac_foreign"), false)
  deleteActiveRun(runId)
})

test("HMAC 列表反例：已决行不进 keep、不重发卡", () => {
  const runId = "run_hmac_decided"
  seedRestoreSession("ses_hmac_decided", runId, "ws_hmac_decided")
  const db = getDatabase()
  insertApproval(db, {
    id: "apr_hmac_open",
    runId,
    toolCallId: "tool_open",
    name: "write_file",
    args: JSON.stringify({ path: "open.txt" }),
    hmac: "h",
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: "apr_sdk_open"
  })
  insertApproval(db, {
    id: "apr_hmac_decided",
    runId,
    toolCallId: "tool_decided",
    name: "write_file",
    args: JSON.stringify({ path: "done.txt" }),
    hmac: "h2",
    decision: "allow",
    createdAt: Date.now(),
    sdkApprovalId: "apr_sdk_decided"
  })
  holdAgentRun({
    runId,
    window: recordWindow([]),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: "ses_hmac_decided",
      workspaceId: "ws_hmac_decided",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const events: SentEvent[] = []
  const restored = restoreHeldWaitingApprovals({
    runId,
    hmacPending: [getApproval(db, "apr_hmac_open")!, getApproval(db, "apr_hmac_decided")!],
    items: [{ approvalId: "apr_hmac_open", toolCallId: "tool_open", name: "write_file" }],
    window: recordWindow(events)
  })
  assert.equal(restored.keep.map((item) => item.approvalId).join(), "apr_hmac_open")
  assert.equal(events.some((event) => event.approvalId === "apr_hmac_decided"), false)
  assert.equal(getApproval(db, "apr_hmac_decided")?.decision, "allow")
  deleteActiveRun(runId)
})

test("HMAC 列表反例：缺参行走 deny，不跳过、不发卡", () => {
  const runId = "run_hmac_noargs"
  seedRestoreSession("ses_hmac_noargs", runId, "ws_hmac_noargs")
  const db = getDatabase()
  insertApproval(db, {
    id: "apr_hmac_noargs",
    runId,
    toolCallId: "tool_noargs",
    name: "write_file",
    args: "",
    hmac: "h",
    decision: null,
    createdAt: Date.now(),
    sdkApprovalId: "apr_sdk_noargs"
  })
  holdAgentRun({
    runId,
    window: recordWindow([]),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: "ses_hmac_noargs",
      workspaceId: "ws_hmac_noargs",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "write" }]
    }
  })
  const events: SentEvent[] = []
  const restored = restoreHeldWaitingApprovals({
    runId,
    hmacPending: [getApproval(db, "apr_hmac_noargs")!],
    items: [],
    window: recordWindow(events)
  })
  assert.equal(restored.keep.length, 0)
  assert.equal(events.some((event) => event.type === "approval.required"), false)
  assert.equal(getApproval(db, "apr_hmac_noargs")?.decision, "deny")
  deleteActiveRun(runId)
})
