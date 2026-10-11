/**
 * 显式截断：看不见的尾巴不删、活 run 拒绝、过期快照拒绝、中途抛错回滚。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import type { BrowserWindow } from "electron"

const {
  applyExplicitSessionTruncate,
  clearAllConversationSessionAllows,
  deleteActiveRun,
  getActiveRun,
  getDatabase,
  grantConversationToolAllow,
  holdAgentRun,
  holdRunThenPersistUser,
  outgoingUserIdConflict,
  sessionHasBlockingRun,
  insertRun,
  MESSAGE_ID_SESSION_MISMATCH,
  persistMessage,
  setTruncateThrowAfterFirstDeleteForTest,
  snapshotConversationSessionAllow,
  truncateSessionFrom
} = await import("./session-truncate.behavior.load.ts")

function seedSession(sessionId: string): void {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_trunc", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_trunc", "truncate", 1, 1)
}

function insertMessage(sessionId: string, id: string, role: string, createdAt: number): void {
  getDatabase()
    .prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, sessionId, role, id, createdAt)
}

function messageIds(sessionId: string): string[] {
  return (
    getDatabase()
      .prepare("SELECT id FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC")
      .all(sessionId) as Array<{ id: string }>
  ).map((row) => row.id)
}

function fakeWindow(): BrowserWindow {
  return { isDestroyed: () => false, webContents: { send() {} } } as unknown as BrowserWindow
}

test.beforeEach(() => {
  clearAllConversationSessionAllows()
  setTruncateThrowAfterFirstDeleteForTest(false)
})

test.afterEach(() => {
  setTruncateThrowAfterFirstDeleteForTest(false)
})

function ids(sessionId: string, ...suffixes: string[]): string[] {
  return suffixes.map((suffix) => `${sessionId}_${suffix}`)
}

test("库里多出的心跳尾巴对不上名单就不删", () => {
  const sessionId = "ses_trunc_bg"
  const [u1, a1, u2, a2, hbU, hbA] = ids(sessionId, "u1", "a1", "u2", "a2", "hb_u", "hb_a")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  insertMessage(sessionId, u2, "user", 3)
  insertMessage(sessionId, a2, "assistant", 4)
  insertMessage(sessionId, hbU, "user", 5)
  insertMessage(sessionId, hbA, "assistant", 6)
  grantConversationToolAllow(sessionId, "write_file")
  const result = applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: u2,
    expectedTailIds: [a2],
    reason: "regenerate"
  })
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_STALE_SNAPSHOT" })
  assert.deepEqual(messageIds(sessionId), [u1, a1, u2, a2, hbU, hbA])
  assert.equal(snapshotConversationSessionAllow(sessionId).toolNames.has("write_file"), true)
})

test("waiting_review 拒绝截断", () => {
  const sessionId = "ses_trunc_wait"
  const [u1, a1] = ids(sessionId, "u1", "a1")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  insertRun(getDatabase(), {
    id: "run_trunc_wait",
    sessionId,
    workspaceId: "ws_trunc",
    kind: "agent",
    status: "waiting_review",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  const result = applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: u1,
    expectedTailIds: [a1],
    reason: "regenerate"
  })
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_RUN_ACTIVE" })
  assert.deepEqual(messageIds(sessionId), [u1, a1])
})

test("内存里的活 run 拒绝截断", () => {
  const sessionId = "ses_trunc_live"
  const [u1, a1] = ids(sessionId, "u1", "a1")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  holdAgentRun({
    runId: "run_trunc_live",
    window: fakeWindow(),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_trunc",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "hi" }]
    }
  })
  try {
    const result = applyExplicitSessionTruncate({
      sessionId,
      afterMessageId: u1,
      expectedTailIds: [a1],
      reason: "regenerate"
    })
    assert.deepEqual(result, { ok: false, code: "TRUNCATE_RUN_ACTIVE" })
    assert.equal(messageIds(sessionId).includes(a1), true)
  } finally {
    deleteActiveRun("run_trunc_live")
  }
})

test("过期快照拒绝截断", () => {
  const sessionId = "ses_trunc_stale"
  const [u1, a1, a1b] = ids(sessionId, "u1", "a1", "a1b")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  insertMessage(sessionId, a1b, "assistant", 3)
  const result = applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: u1,
    expectedTailIds: [a1],
    reason: "regenerate"
  })
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_STALE_SNAPSHOT" })
  assert.equal(messageIds(sessionId).length, 3)
})

test("中途抛错整段回滚，旧回复还在", () => {
  const sessionId = "ses_trunc_rollback"
  const [u1, a1, a2] = ids(sessionId, "u1", "a1", "a2")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  insertMessage(sessionId, a2, "assistant", 3)
  grantConversationToolAllow(sessionId, "write_file")
  setTruncateThrowAfterFirstDeleteForTest(true)
  assert.throws(
    () =>
      applyExplicitSessionTruncate({
        sessionId,
        afterMessageId: u1,
        expectedTailIds: [a1, a2],
        reason: "regenerate"
      }),
    /TRUNCATE_TEST_INJECTED/
  )
  assert.deepEqual(messageIds(sessionId), [u1, a1, a2])
  assert.equal(snapshotConversationSessionAllow(sessionId).toolNames.has("write_file"), true)
})

test("regenerate 真路径截尾巴并清本会话允许", () => {
  const sessionId = "ses_trunc_regen"
  const [u1, a1, u2, a2] = ids(sessionId, "u1", "a1", "u2", "a2")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  insertMessage(sessionId, u2, "user", 3)
  insertMessage(sessionId, a2, "assistant", 4)
  grantConversationToolAllow(sessionId, "write_file")
  const result = applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: u2,
    expectedTailIds: [a2],
    reason: "regenerate"
  })
  assert.deepEqual(result, { ok: true, deleted: 1 })
  assert.deepEqual(messageIds(sessionId), [u1, a1, u2])
  assert.equal(snapshotConversationSessionAllow(sessionId).toolNames.has("write_file"), false)
})

test("edit-and-resend 真路径截尾巴并清本会话允许", async () => {
  const sessionId = "ses_trunc_edit"
  const [u1, a1] = ids(sessionId, "u1", "a1")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  grantConversationToolAllow(sessionId, "write_file")
  const result = applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: u1,
    expectedTailIds: [a1],
    reason: "edit",
    persistUser: { content: "edited", messageId: u1, attached: [] }
  })
  assert.deepEqual(result, { ok: true, deleted: 1 })
  assert.deepEqual(messageIds(sessionId), [u1])
  assert.equal(snapshotConversationSessionAllow(sessionId).toolNames.has("write_file"), false)
  const row = getDatabase()
    .prepare("SELECT content FROM messages WHERE id = ?")
    .get(u1) as { content: string }
  assert.equal(row.content, "edited")
})

test("rewind truncateFrom 必须带看见的尾巴", async () => {
  const sessionId = "ses_trunc_rewind"
  const [u1, a1, hbU] = ids(sessionId, "u1", "a1", "hb_u")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  insertMessage(sessionId, hbU, "user", 3)
  const stale = await truncateSessionFrom(sessionId, u1, [u1, a1])
  assert.deepEqual(stale, { ok: false, code: "TRUNCATE_STALE_SNAPSHOT" })
  const ok = await truncateSessionFrom(sessionId, u1, [u1, a1, hbU])
  assert.deepEqual(ok, { ok: true, deleted: 3 })
  assert.deepEqual(messageIds(sessionId), [])
})

test("尾巴 id 不 trim，对不上就不删", () => {
  const sessionId = "ses_trunc_trim"
  const [u1, a1] = ids(sessionId, "u1", "a1")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  const result = applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: u1,
    expectedTailIds: [`${a1} `],
    reason: "regenerate"
  })
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_STALE_SNAPSHOT" })
  assert.deepEqual(messageIds(sessionId), [u1, a1])
})

test("session-truncate 没有隐式推断，也不 trim id", () => {
  const src = readFileSync(new URL("./session-truncate.ts", import.meta.url), "utf8")
  assert.doesNotMatch(src, /maybeTruncate/)
  assert.doesNotMatch(src, /\.trim\(\)/)
})

test("soft 4：rewind 预检 dryRun 通过也不删，活 run / 尾巴不对照样拒", () => {
  const sessionId = "ses_trunc_dry"
  const [u1, a1, u2, a2] = ids(sessionId, "u1", "a1", "u2", "a2")
  seedSession(sessionId)
  insertMessage(sessionId, u1, "user", 1)
  insertMessage(sessionId, a1, "assistant", 2)
  insertMessage(sessionId, u2, "user", 3)
  insertMessage(sessionId, a2, "assistant", 4)
  grantConversationToolAllow(sessionId, "write_file")
  const ok = applyExplicitSessionTruncate({
    sessionId,
    fromMessageId: u2,
    expectedTailIds: [u2, a2],
    reason: "rewind",
    dryRun: true
  })
  assert.deepEqual(ok, { ok: true, deleted: 0 })
  assert.deepEqual(messageIds(sessionId), [u1, a1, u2, a2])
  assert.equal(snapshotConversationSessionAllow(sessionId).toolNames.has("write_file"), true)
  const stale = applyExplicitSessionTruncate({
    sessionId,
    fromMessageId: u2,
    expectedTailIds: [u2],
    reason: "rewind",
    dryRun: true
  })
  assert.deepEqual(stale, { ok: false, code: "TRUNCATE_STALE_SNAPSHOT" })
  holdAgentRun({
    runId: "run_trunc_dry",
    window: fakeWindow(),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_trunc",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "hi" }]
    }
  })
  try {
    const busy = applyExplicitSessionTruncate({
      sessionId,
      fromMessageId: u2,
      expectedTailIds: [u2, a2],
      reason: "rewind",
      dryRun: true
    })
    assert.deepEqual(busy, { ok: false, code: "TRUNCATE_RUN_ACTIVE" })
  } finally {
    deleteActiveRun("run_trunc_dry")
  }
  assert.deepEqual(messageIds(sessionId), [u1, a1, u2, a2])
})

test("soft 5：persistMessage 按 id 覆盖必须同会话，不能改写别的会话的消息", () => {
  const mine = "ses_persist_mine"
  const other = "ses_persist_other"
  seedSession(mine)
  seedSession(other)
  const otherId = persistMessage(other, "user", "theirs", undefined, `${other}_u1`)
  const partsBefore = (
    getDatabase().prepare("SELECT COUNT(*) as n FROM message_parts WHERE message_id = ?").get(otherId) as {
      n: number
    }
  ).n
  assert.throws(
    () => persistMessage(mine, "user", "hijack", undefined, otherId),
    new RegExp(MESSAGE_ID_SESSION_MISMATCH)
  )
  const row = getDatabase()
    .prepare("SELECT session_id, content FROM messages WHERE id = ?")
    .get(otherId) as { session_id: string; content: string }
  assert.deepEqual({ ...row }, { session_id: other, content: "theirs" })
  assert.ok(partsBefore > 0)
  const partsAfter = (
    getDatabase().prepare("SELECT COUNT(*) as n FROM message_parts WHERE message_id = ?").get(otherId) as {
      n: number
    }
  ).n
  assert.equal(partsAfter, partsBefore)
  // 同会话同 id 仍可覆盖（checkpoint）。
  const ownId = persistMessage(mine, "assistant", "v1", undefined, `${mine}_a1`)
  persistMessage(mine, "assistant", "v2", undefined, ownId)
  const own = getDatabase().prepare("SELECT content FROM messages WHERE id = ?").get(ownId) as { content: string }
  assert.equal(own.content, "v2")
})

test("leo 小修 2：用户句 id 属别的会话 → 撤掉 run 回稳定码，本会话还能再开跑", () => {
  const mine = "ses_hold_mine"
  const other = "ses_hold_other"
  seedSession(mine)
  seedSession(other)
  const otherId = persistMessage(other, "user", "theirs", undefined, `${other}_u1`)
  const hold = (runId: string) => ({
    runId,
    window: fakeWindow(),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: mine,
      workspaceId: "ws_trunc",
      modelId: "m",
      mode: "agent" as const,
      attachments: [],
      messages: [{ role: "user" as const, content: "hi" }]
    }
  })
  assert.equal(outgoingUserIdConflict(mine, otherId), true)
  assert.equal(outgoingUserIdConflict(mine, `${mine}_fresh`), false)
  assert.equal(outgoingUserIdConflict(mine, undefined), false)

  const failed = holdRunThenPersistUser(hold("run_hold_bad"), () => {
    persistMessage(mine, "user", "hijack", undefined, otherId)
  })
  assert.deepEqual(failed, { ok: false, code: MESSAGE_ID_SESSION_MISMATCH })
  assert.equal(getActiveRun("run_hold_bad"), undefined)
  assert.equal(sessionHasBlockingRun(mine), false)

  // 不再报 RUN_ACTIVE：能截断、能开新 run。
  const [u1, a1] = ids(mine, "u1", "a1")
  insertMessage(mine, u1, "user", 10)
  insertMessage(mine, a1, "assistant", 11)
  assert.deepEqual(
    applyExplicitSessionTruncate({ sessionId: mine, afterMessageId: u1, expectedTailIds: [a1], reason: "regenerate" }),
    { ok: true, deleted: 1 }
  )
  try {
    const ok = holdRunThenPersistUser(hold("run_hold_ok"), () => {
      persistMessage(mine, "user", "hi again", undefined, `${mine}_u2`)
    })
    assert.deepEqual(ok, { ok: true })
    assert.ok(getActiveRun("run_hold_ok"))
    assert.equal(sessionHasBlockingRun(mine), true)
  } finally {
    deleteActiveRun("run_hold_ok")
  }
  const theirs = getDatabase().prepare("SELECT session_id, content FROM messages WHERE id = ?").get(otherId) as {
    session_id: string
    content: string
  }
  assert.deepEqual({ ...theirs }, { session_id: other, content: "theirs" })
})

test("leo 小修 2：agent-run-start 开跑前预检、挂 run 与落用户句绑在一起", () => {
  const src = readFileSync(new URL("./agent-run-start.ts", import.meta.url), "utf8")
  const precheck = src.indexOf("outgoingUserIdConflict(input.sessionId, lastUser?.id)")
  const reset = src.indexOf("applyAgentRunSessionAllowReset({")
  const truncate = src.indexOf("applyExplicitSessionTruncate({")
  assert.ok(precheck > 0 && precheck < reset && precheck < truncate)
  assert.match(src, /return \{ ok: false, code: MESSAGE_ID_SESSION_MISMATCH \}/)
  assert.match(src, /const held = holdRunThenPersistUser\(/)
  assert.match(src, /if \(!held\.ok\) return held/)
  assert.doesNotMatch(src, /\bholdAgentRun\(/)
})
