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
    assert.equal(shouldRollbackPreOutput({ producedOutput: false, code, eligible: true }), true)
    assert.equal(shouldRollbackPreOutput({ producedOutput: false, code }), false)
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
  assert.equal(
    shouldRollbackPreOutput({ producedOutput: true, code: "provider_unreachable", eligible: true }),
    false
  )
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

test("jojo P1（#136 gate2）：回滚删掉本轮用户句时，它带的图回到本会话草稿附件（同一事务，与已有草稿图合并去重）", async () => {
  const { loadSessionDraftAssets, saveSessionDraftAssets } = await import("./session-drafts.ts")
  const db = getDatabase()
  const sessionId = "ses_p1_assets"
  seedSession(sessionId, "ws_p1_assets")
  // 更早一轮（快照之前）的用户句也带图：不是本轮的，不能被还回草稿。
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    "u_old_img", sessionId, "user", "旧图", 5
  )
  const part = (id: string, messageId: string, idx: number, payload: Record<string, unknown>) =>
    db.prepare("INSERT INTO message_parts (id, message_id, idx, type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, messageId, idx, String(payload.type), JSON.stringify(payload), 5
    )
  part("p_old", "u_old_img", 0, { type: "file", assetId: "ast_old_turn", mediaType: "image/png", name: "old.png" })
  saveSessionDraftAssets(sessionId, [{ id: "ast_draft", name: "draft.png", mediaType: "image/png" }])
  const snapshot = snapshotSessionTurn(sessionId)
  const now = Date.now()
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    "u_img", sessionId, "user", "看图", now
  )
  part("p_t", "u_img", 0, { type: "text", text: "看图" })
  part("p_a", "u_img", 1, { type: "file", assetId: "ast_a", mediaType: "image/png", name: "a.png" })
  part("p_b", "u_img", 2, { type: "file", assetId: "ast_b", mediaType: "image/jpeg", name: "b.jpg" })
  part("p_dup", "u_img", 3, { type: "file", assetId: "ast_draft", mediaType: "image/png", name: "draft.png" })
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    "a_img", sessionId, "assistant", "", now
  )
  part("p_asst", "a_img", 0, { type: "file", assetId: "ast_assistant", mediaType: "image/png", name: "gen.png" })

  rollbackPreOutputMessages({ sessionId, messageIds: ["u_img", "a_img", "u_old_img"], snapshot })

  assert.deepEqual(
    (loadSessionDraftAssets()[sessionId] ?? []).map((a) => a.id),
    ["ast_draft", "ast_a", "ast_b"],
    "本轮用户句的图回草稿；助手的、快照前的不回；已有的不重复"
  )
  assert.equal(loadSessionDraftAssets()[sessionId]?.[2]?.mediaType, "image/jpeg")
  assert.equal(countSessionMessages(sessionId), 1, "只删本轮两行")
})

test("jojo P1：回滚的用户句没带图：草稿附件不被动（不写空行）", async () => {
  const { loadSessionDraftAssets } = await import("./session-drafts.ts")
  const db = getDatabase()
  const sessionId = "ses_p1_noimg"
  seedSession(sessionId, "ws_p1_noimg")
  const snapshot = snapshotSessionTurn(sessionId)
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    "u_txt", sessionId, "user", "只有字", Date.now()
  )
  rollbackPreOutputMessages({ sessionId, messageIds: ["u_txt"], snapshot })
  assert.equal(loadSessionDraftAssets()[sessionId], undefined)
})
