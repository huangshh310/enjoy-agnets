/**
 * jojo P1：两轮会话里重新生成第一条回复误报「有新内容」并重跑最后一轮。
 * 走真库：用户句用 renderer id 落库，助手行由 main 另起 id（含只有工具 part、没有正文的助手行）。
 * 视图里助手气泡仍是 `msg_pending_*` 占位 → 旧逻辑 expectedTailIds 永远对不上 → STALE。
 * 修法：开截前读库，reconcileTailWithDb 把视图尾巴对成库 id；心跳等真后台行仍然拒绝、不删。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  reconcileTailWithDb,
  tailIdsAfterKeep,
  tailIdsFromInclusive
} from "../../renderer/src/hooks/session-truncate-intent.ts"

const {
  applyExplicitSessionTruncate,
  getDatabase,
  listMessages,
  persistFinishedAssistant,
  persistUserTurn
} = await import("./regenerate-tail.behavior.load.ts")

const tick = () => new Promise((resolve) => setTimeout(resolve, 3))

function seed(sessionId: string) {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_regen_tail", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_regen_tail", "regen", 1, 1)
}

function assistantText(sessionId: string, text: string, runId: string): string {
  const id = persistFinishedAssistant({
    sessionId,
    content: text,
    reasoning: "",
    tools: [],
    startedAt: Date.now(),
    extras: {},
    runKind: "agent",
    runId
  })
  assert.ok(id)
  return id
}

function assistantToolOnly(sessionId: string, runId: string): string {
  const id = persistFinishedAssistant({
    sessionId,
    content: "",
    reasoning: "",
    tools: [
      {
        id: `tool_${runId}`,
        name: "bash",
        state: "output-available",
        args: { command: "ls" },
        result: { stdout: "README.md" }
      }
    ],
    startedAt: Date.now(),
    extras: {},
    runKind: "agent",
    runId
  })
  assert.ok(id)
  return id
}

/** hello → stub-ok hello → hello two → （只有工具的）回复；视图里两条助手都是占位 id。 */
async function twoTurnSession(sessionId: string) {
  seed(sessionId)
  const u1 = `${sessionId}_u1`
  const u2 = `${sessionId}_u2`
  persistUserTurn(sessionId, "hello", [], u1)
  await tick()
  const a1 = assistantText(sessionId, "stub-ok hello", `${sessionId}_run1`)
  await tick()
  persistUserTurn(sessionId, "hello two", [], u2)
  await tick()
  const a2 = assistantToolOnly(sessionId, `${sessionId}_run2`)
  const view = [
    { id: u1, role: "user", content: "hello" },
    { id: "msg_pending_1", role: "assistant", content: "stub-ok hello" },
    { id: u2, role: "user", content: "hello two" },
    { id: "msg_pending_2", role: "assistant", content: "" }
  ]
  return { u1, u2, a1, a2, view }
}

async function dbRows(sessionId: string) {
  return (await listMessages(sessionId)).map((row) => ({ id: row.id, role: row.role, content: row.content }))
}

function remainingIds(sessionId: string): string[] {
  return (
    getDatabase()
      .prepare("SELECT id FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC")
      .all(sessionId) as Array<{ id: string }>
  ).map((row) => row.id)
}

test("根因：视图占位 id 直接当名单，重新生成第一条回复被 main 判 STALE（什么都没删）", async () => {
  const sessionId = "ses_regen_root"
  const { u1, view } = await twoTurnSession(sessionId)
  const before = remainingIds(sessionId)
  const result = applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: u1,
    expectedTailIds: tailIdsAfterKeep(view, u1),
    reason: "agent.run"
  })
  assert.deepEqual(result, { ok: false, code: "TRUNCATE_STALE_SNAPSHOT" })
  assert.deepEqual(remainingIds(sessionId), before)
})

test("修后：重新生成第一条回复，对账成库 id，正好删掉第一条回复及后面一轮", async () => {
  const sessionId = "ses_regen_first"
  const { u1, u2, a1, a2, view } = await twoTurnSession(sessionId)
  const expected = reconcileTailWithDb({ view, db: await dbRows(sessionId), anchorId: u1, mode: "after" })
  assert.deepEqual(expected, [a1, u2, a2])
  const result = applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: u1,
    expectedTailIds: expected!,
    reason: "agent.run"
  })
  assert.deepEqual(result, { ok: true, deleted: 3 })
  assert.deepEqual(remainingIds(sessionId), [u1])
})

test("修后：最后一轮是只有工具 part 的助手行，也能对上，只删这一条", async () => {
  const sessionId = "ses_regen_tool_last"
  const { u1, u2, a1, a2, view } = await twoTurnSession(sessionId)
  const expected = reconcileTailWithDb({ view, db: await dbRows(sessionId), anchorId: u2, mode: "after" })
  assert.deepEqual(expected, [a2])
  const result = applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: u2,
    expectedTailIds: expected!,
    reason: "agent.run"
  })
  assert.deepEqual(result, { ok: true, deleted: 1 })
  assert.deepEqual(remainingIds(sessionId), [u1, a1, u2])
})

test("rewind（from）同样对账：从第一句起删整段", async () => {
  const sessionId = "ses_regen_rewind"
  const { u1, u2, a1, a2, view } = await twoTurnSession(sessionId)
  assert.notDeepEqual(tailIdsFromInclusive(view, u1), [u1, a1, u2, a2])
  const expected = reconcileTailWithDb({ view, db: await dbRows(sessionId), anchorId: u1, mode: "from" })
  assert.deepEqual(expected, [u1, a1, u2, a2])
})

test("MF-A 不放松：库里多出心跳 hb_u / hb_a，对账失败，什么都不删", async () => {
  const sessionId = "ses_regen_hb"
  const { u1, view } = await twoTurnSession(sessionId)
  await tick()
  persistUserTurn(sessionId, "heartbeat", [], `${sessionId}_hb_u`)
  await tick()
  assistantText(sessionId, "hb reply", `${sessionId}_hb_run`)
  const before = remainingIds(sessionId)
  assert.equal(reconcileTailWithDb({ view, db: await dbRows(sessionId), anchorId: u1, mode: "after" }), null)
  assert.deepEqual(remainingIds(sessionId), before)
})

test("一个占位气泡不吞两条库助手行（续跑另起的行要先刷新再点）", async () => {
  const sessionId = "ses_regen_two_rows"
  const { u2, view } = await twoTurnSession(sessionId)
  await tick()
  assistantText(sessionId, "resumed part", `${sessionId}_run3`)
  assert.equal(reconcileTailWithDb({ view, db: await dbRows(sessionId), anchorId: u2, mode: "after" }), null)
})

test("没落库的空气泡被跳过；锚点不在库里返回 null", async () => {
  const sessionId = "ses_regen_unpersisted"
  const { u1, u2, a1, a2, view } = await twoTurnSession(sessionId)
  const withGhost = [...view, { id: "msg_pending_ghost", role: "assistant", content: "" }]
  assert.deepEqual(
    reconcileTailWithDb({ view: withGhost, db: await dbRows(sessionId), anchorId: u1, mode: "after" }),
    [a1, u2, a2]
  )
  assert.equal(
    reconcileTailWithDb({ view, db: await dbRows(sessionId), anchorId: "msg_not_persisted", mode: "after" }),
    null
  )
})
