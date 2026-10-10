/**
 * 首字前失败：库里不留本轮气泡；前台不进 Inbox；双击同 id 不写两遍。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { getRun, insertRun } from "@enjoy-agents/db"
import { PRE_OUTPUT_FAILURE_CODES } from "@enjoy-agents/ipc-contract/pre-output-failure"
import {
  peekClientRequest,
  rememberClientRequest,
  resetClientRequestsForTest
} from "./client-request-dedupe.ts"
import {
  backgroundKindOf,
  isForegroundPreOutputFailure,
  preOutputAttention,
  shouldRollbackPreOutput
} from "./pre-output-fail.ts"
import {
  countSessionMessages,
  markRunDiscardedPreOutput,
  rollbackPreOutputMessages,
  snapshotSessionTurn
} from "./pre-output-rollback.ts"
import { clearFocusedSessionId, setFocusedSessionId } from "./session-focus.ts"

const { getDatabase } = await import("./database.ts")

const CODES = PRE_OUTPUT_FAILURE_CODES.options

function seedSession(sessionId: string, workspaceId: string): void {
  const db = getDatabase()
  const now = 1_000
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(workspaceId, workspaceId, `/tmp/${workspaceId}`, now, now)
  db.prepare(
    "INSERT OR REPLACE INTO sessions (id, workspace_id, title, created_at, updated_at, workflow_status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sessionId, workspaceId, "新对话", now, now, "todo")
}

function writeTurn(sessionId: string, runId: string, workspaceId: string): { userId: string } {
  const db = getDatabase()
  const userId = `msg_user_${runId}`
  const asstId = `msg_asst_${runId}`
  const now = Date.now()
  db.prepare(
    "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, sessionId, "user", "hello", now)
  db.prepare(
    "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(asstId, sessionId, "assistant", "", now)
  insertRun(db, {
    id: runId,
    sessionId,
    workspaceId,
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  return { userId }
}

function sessionMeta(sessionId: string): { title: string; updatedAt: number; n: number } {
  const row = getDatabase()
    .prepare("SELECT title, updated_at as updatedAt FROM sessions WHERE id = ?")
    .get(sessionId) as { title: string; updatedAt: number }
  return { ...row, n: countSessionMessages(sessionId) }
}

test("四码前台失败：库里 0 条新消息，run failed + discarded，会话字段不动", () => {
  setFocusedSessionId("ses_pre_fg")
  for (const code of CODES) {
    const sessionId = `ses_${code}`
    const workspaceId = `ws_${code}`
    const runId = `run_${code}`
    seedSession(sessionId, workspaceId)
    const before = snapshotSessionTurn(sessionId)
    writeTurn(sessionId, runId, workspaceId)
    assert.ok(countSessionMessages(sessionId) >= 1)
    assert.equal(shouldRollbackPreOutput({ producedOutput: false, code }), true)
    assert.equal(
      isForegroundPreOutputFailure({ input: { sessionId }, backgroundKind: undefined }, sessionId),
      true
    )
    const ids = getDatabase()
      .prepare("SELECT id FROM messages WHERE session_id = ?")
      .all(sessionId) as Array<{ id: string }>
    rollbackPreOutputMessages({
      sessionId,
      messageIds: ids.map((row) => row.id),
      snapshot: before
    })
    markRunDiscardedPreOutput(runId, code)
    const after = sessionMeta(sessionId)
    assert.equal(after.n, 0, code)
    assert.equal(after.title, "新对话", code)
    assert.equal(after.updatedAt, before?.updatedAt, code)
    const run = getRun(getDatabase(), runId)
    assert.equal(run?.status, "failed", code)
    assert.equal(run?.discardedPreOutput, 1, code)
    assert.equal(run?.error, code)
    assert.equal(preOutputAttention(true), "neutral")
  }
  clearFocusedSessionId()
})

test("后台自动化失败进 Inbox（attention=error）", () => {
  const kind = backgroundKindOf({
    automationSource: { isCatchUp: false }
  })
  assert.equal(kind, "automation")
  assert.equal(
    isForegroundPreOutputFailure({
      input: { sessionId: "ses_auto" },
      backgroundKind: kind
    }),
    false
  )
  assert.equal(preOutputAttention(false), "error")
})

test("已经有产出则不回滚，消息留下", () => {
  const sessionId = "ses_after_out"
  const workspaceId = "ws_after_out"
  seedSession(sessionId, workspaceId)
  const { userId } = writeTurn(sessionId, "run_after_out", workspaceId)
  getDatabase()
    .prepare("UPDATE messages SET content = ? WHERE id = ?")
    .run("hi", `msg_asst_run_after_out`)
  assert.equal(shouldRollbackPreOutput({ producedOutput: true, code: "provider_unreachable" }), false)
  assert.equal(countSessionMessages(sessionId), 2)
  assert.equal(userId.startsWith("msg_") || userId.length > 0, true)
})

test("同一 clientRequestId 60s 内不写第二遍", () => {
  resetClientRequestsForTest()
  rememberClientRequest("ses_dup", "req_1", "run_first")
  assert.equal(peekClientRequest("ses_dup", "req_1"), "run_first")
  assert.equal(peekClientRequest("ses_dup", "req_2"), undefined)
  assert.equal(peekClientRequest("ses_dup", "req_1", Date.now() + 61_000), undefined)
  resetClientRequestsForTest()
})
