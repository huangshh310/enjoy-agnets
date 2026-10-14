/**
 * leo MF-1 / MF-2 反例（真临时库）：首字前回滚只删本轮新插入的行。
 * 重新生成 / 编辑重发只 UPDATE 已有用户句；回挂 waiting / running、续跑沿用的助手行都不删。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"

const L = await import("./pre-output-rollback-ownership.behavior.load.ts")

const sent: unknown[] = []
const win = {
  isDestroyed: () => false,
  webContents: { send: (_channel: string, event: unknown) => sent.push(event) }
} as unknown as BrowserWindow

const unreachable = () => Object.assign(new Error("connect ECONNREFUSED 127.0.0.1"), { code: "ECONNREFUSED" })
const rejected = () => Object.assign(new Error("401"), { status: 401 })

function seed(sid: string, opts: { title?: string } = {}) {
  const db = L.getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id,name,root_path,created_at,updated_at) VALUES (?,?,?,?,?)"
  ).run("ws_own", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT INTO sessions (id,workspace_id,title,created_at,updated_at,workflow_status) VALUES (?,?,?,?,?,?)"
  ).run(sid, "ws_own", opts.title ?? "t", 1, 1, "todo")
  db.prepare("INSERT INTO messages (id,session_id,role,content,created_at) VALUES (?,?,?,?,?)").run(
    `${sid}_u1`, sid, "user", "original question", 10
  )
  db.prepare("INSERT INTO messages (id,session_id,role,content,created_at) VALUES (?,?,?,?,?)").run(
    `${sid}_a1`, sid, "assistant", "old answer", 11
  )
}

const ids = (sid: string) =>
  (
    L.getDatabase()
      .prepare("SELECT id FROM messages WHERE session_id=? ORDER BY created_at, id")
      .all(sid) as { id: string }[]
  ).map((row) => row.id)

const content = (id: string) =>
  (L.getDatabase().prepare("SELECT content FROM messages WHERE id = ?").get(id) as { content: string } | undefined)
    ?.content

function hold(sid: string, runId: string, extra: Record<string, unknown> = {}) {
  L.holdAgentRun({
    runId,
    window: win,
    input: { sessionId: sid, workspaceId: "ws_own", messages: [{ role: "user", content: "q" }], runtimeId: "enjoy-local" } as never,
    workspaceRoot: "/tmp",
    messages: [],
    secret: { apiKey: "k" } as never,
    sessionSnapshot: L.snapshotSessionTurn(sid),
    ...extra
  })
  const run = L.getActiveRun(runId)
  assert.ok(run)
  return run
}

function insertRunRow(sid: string, runId: string, status: string) {
  L.insertRun(L.getDatabase(), {
    id: runId, sessionId: sid, workspaceId: "ws_own", kind: "agent", status,
    modelId: "m", providerId: null, checkpoint: null, error: null
  })
}

test("重新生成：截断保留 u1 并 UPDATE u1，首字前失败 u1 仍在、气泡保留", async () => {
  const sid = "ses_own_regen"
  seed(sid)
  let outcome: { id: string; inserted: boolean } | undefined
  const cut = L.applyExplicitSessionTruncate({
    sessionId: sid,
    afterMessageId: `${sid}_u1`,
    expectedTailIds: [`${sid}_a1`],
    reason: "agent.run",
    persistUser: { content: "original question", messageId: `${sid}_u1`, attached: [] },
    onUserPersisted: (value) => {
      outcome = value
    }
  })
  assert.equal(cut.ok, true)
  assert.deepEqual(outcome, { id: `${sid}_u1`, inserted: false })
  insertRunRow(sid, "run_own_regen", "running")
  const run = hold(sid, "run_own_regen", { rollbackEligible: true })
  run.keptUserMessage = true
  sent.length = 0
  await L.failAgentPump("run_own_regen", run, unreachable())
  assert.deepEqual(ids(sid), [`${sid}_u1`])
  const err = sent.find((e) => (e as { type?: string }).type === "run.error") as Record<string, unknown>
  assert.equal(err.preOutput, true)
  assert.equal(err.keptUserMessage, true)
})

test("快照兜底：快照前就有的行即便被误传进来也不删（leo 重新生成探针）", () => {
  const sid = "ses_own_guard"
  seed(sid)
  const snapshot = L.snapshotSessionTurn(sid)
  L.rollbackPreOutputMessages({ sessionId: sid, messageIds: [`${sid}_u1`, `${sid}_a1`], snapshot })
  assert.deepEqual(ids(sid), [`${sid}_u1`, `${sid}_a1`])
})

test("编辑重发：同 id UPDATE 只回报 inserted=false，回滚不删", () => {
  const sid = "ses_own_edit"
  seed(sid)
  const outcome = L.persistUserTurnOutcome(sid, "edited question", [], `${sid}_u1`)
  assert.deepEqual(outcome, { id: `${sid}_u1`, inserted: false })
  L.rollbackPreOutputMessages({
    sessionId: sid,
    messageIds: L.preOutputRollbackIds({ userMessageId: outcome?.inserted ? outcome.id : undefined })
  })
  assert.ok(ids(sid).includes(`${sid}_u1`))
  assert.equal(content(`${sid}_u1`), "edited question")
})

test("全新一轮：新插入的用户句 + 空助手首字前失败都删", async () => {
  const sid = "ses_own_fresh"
  seed(sid)
  const sessionSnapshot = L.snapshotSessionTurn(sid)
  const user = L.persistUserTurnOutcome(sid, "brand new", [], `${sid}_u2`)
  assert.deepEqual(user, { id: `${sid}_u2`, inserted: true })
  const asst = L.persistMessageOutcome(sid, "assistant", "", undefined, `${sid}_a2`)
  assert.equal(asst.inserted, true)
  insertRunRow(sid, "run_own_fresh", "running")
  const run = hold(sid, "run_own_fresh", { rollbackEligible: true, userMessageId: user?.id, sessionSnapshot })
  run.assistantMessageId = asst.id
  await L.failAgentPump("run_own_fresh", run, rejected())
  assert.deepEqual(ids(sid), [`${sid}_u1`, `${sid}_a1`])
  assert.equal((L.getRun(L.getDatabase(), "run_own_fresh") as { discardedPreOutput: number }).discardedPreOutput, 1)
})

for (const status of ["waiting", "running"] as const) {
  test(`回挂 ${status}：首次调用 401 / ECONNREFUSED 不删重启前的助手行`, async () => {
    for (const [label, error] of [["unreachable", unreachable], ["rejected", rejected]] as const) {
      const sid = `ses_own_rst_${status}_${label}`
      const runId = `run_own_rst_${status}_${label}`
      const db = L.getDatabase()
      db.prepare(
        "INSERT OR IGNORE INTO workspaces (id,name,root_path,created_at,updated_at) VALUES (?,?,?,?,?)"
      ).run("ws_own", "ws", "/tmp", 1, 1)
      db.prepare("INSERT INTO sessions (id,workspace_id,title,created_at,updated_at) VALUES (?,?,?,?,?)").run(
        sid, "ws_own", "t", 1, 1
      )
      insertRunRow(sid, runId, status)
      const row = L.getRun(db, runId) as { createdAt: number }
      db.prepare("INSERT INTO messages (id,session_id,role,content,created_at) VALUES (?,?,?,?,?)").run(
        `${sid}_u1`, sid, "user", "do it", row.createdAt - 5
      )
      db.prepare("INSERT INTO messages (id,session_id,role,content,created_at) VALUES (?,?,?,?,?)").run(
        `${sid}_a1`, sid, "assistant", JSON.stringify({ text: "ran tool X", runId }), row.createdAt + 5
      )
      // 与 restore-waiting-runs / restore-running-runs 同形：不带 rollbackEligible。
      const run = hold(sid, runId, L.readLatestAssistantSnapshot(sid, { runCreatedAt: row.createdAt, runId }))
      assert.equal(run.assistantMessageId, `${sid}_a1`)
      assert.equal(run.rollbackEligible, false)
      await L.failAgentPump(runId, run, error())
      assert.deepEqual(ids(sid), [`${sid}_u1`, `${sid}_a1`], `${status} ${label}`)
      assert.equal((L.getRun(db, runId) as { status: string }).status, "failed")
    }
  })
}

test("续跑：即便误标 eligible，挂上时已有的助手行也不删", async () => {
  const sid = "ses_own_resume"
  seed(sid)
  insertRunRow(sid, "run_own_resume", "running")
  const run = hold(sid, "run_own_resume", { rollbackEligible: true, assistantMessageId: `${sid}_a1` })
  assert.equal(run.rollbackEligible, false)
  assert.deepEqual(
    L.preOutputRollbackIds({ assistantMessageId: `${sid}_a1`, heldAssistantMessageId: `${sid}_a1` }),
    []
  )
  await L.failAgentPump("run_own_resume", run, unreachable())
  assert.deepEqual(ids(sid), [`${sid}_u1`, `${sid}_a1`])
})

test("parts 删除带会话条件：别的会话的消息 id 传进来，行与 parts 都不动", () => {
  const sid = "ses_own_parts"
  const other = "ses_own_parts_other"
  seed(sid)
  seed(other)
  L.persistMessageOutcome(other, "user", "keep me", undefined, `${other}_u1`)
  const parts = () =>
    (L.getDatabase().prepare("SELECT COUNT(*) as n FROM message_parts WHERE message_id = ?").get(`${other}_u1`) as {
      n: number
    }).n
  const before = parts()
  assert.ok(before > 0)
  L.rollbackPreOutputMessages({ sessionId: sid, messageIds: [`${other}_u1`] })
  assert.equal(parts(), before)
  assert.ok(ids(other).includes(`${other}_u1`))
})

test("等待期间用户改名：回滚不覆盖新标题；没改名则复原", () => {
  const sid = "ses_own_title"
  seed(sid, { title: "新对话" })
  const snapshot = L.snapshotSessionTurn(sid)
  const db = L.getDatabase()
  db.prepare("UPDATE sessions SET title = ? WHERE id = ?").run("auto title", sid)
  db.prepare("UPDATE sessions SET title = ? WHERE id = ?").run("user renamed", sid)
  L.rollbackPreOutputMessages({ sessionId: sid, messageIds: [], snapshot, titleAfterStart: "auto title" })
  assert.equal((db.prepare("SELECT title FROM sessions WHERE id = ?").get(sid) as { title: string }).title, "user renamed")
  db.prepare("UPDATE sessions SET title = ? WHERE id = ?").run("auto title", sid)
  L.rollbackPreOutputMessages({ sessionId: sid, messageIds: [], snapshot, titleAfterStart: "auto title" })
  assert.equal((db.prepare("SELECT title FROM sessions WHERE id = ?").get(sid) as { title: string }).title, "新对话")
})

test("leo soft：首字前回滚抛错 → 退回普通 failed，活 run 撤掉（会话不卡 RUN_ACTIVE）", async () => {
  const sid = "ses_own_rb_throw"
  seed(sid)
  insertRunRow(sid, "run_own_rb_throw", "running")
  const run = hold(sid, "run_own_rb_throw", { rollbackEligible: true })
  sent.length = 0
  L.setPreOutputRollbackThrowForTest(true)
  try {
    await L.failAgentPump("run_own_rb_throw", run, unreachable())
  } finally {
    L.setPreOutputRollbackThrowForTest(false)
  }
  assert.equal(L.getActiveRun("run_own_rb_throw"), undefined)
  assert.equal((L.getRun(L.getDatabase(), "run_own_rb_throw") as { status: string }).status, "failed")
  const err = sent.find((e) => (e as { type?: string }).type === "run.error") as Record<string, unknown>
  assert.ok(err)
  assert.notEqual(err.preOutput, true)
})
