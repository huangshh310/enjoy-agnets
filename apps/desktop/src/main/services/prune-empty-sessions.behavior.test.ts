/**
 * luna P3：空「新对话」壳（无消息 / run / 草稿）启动清掉；有草稿 / 有 run / 有消息 / 已归档的不动。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { getDatabase, persistMessage } = await import("./restore-interrupted-running.behavior.load.ts")
const { pruneEmptySessions, deleteSession } = await import("./session-lifecycle.ts")
const { saveSessionDraft } = await import("./session-drafts.ts")
const { insertRun } = await import("@enjoy-agents/db")

function session(tag: string): string {
  const db = getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_prune", "ws", "/tmp", 1, 1)
  const sid = `ses_prune_${tag}`
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sid, "ws_prune", "新对话", 1, 1)
  return sid
}

const exists = (sid: string) => Boolean(getDatabase().prepare("SELECT 1 FROM sessions WHERE id = ?").get(sid))

test("启动清空壳：只删无消息 / 无 run / 无草稿 / 未归档的", () => {
  const empty = session("empty")
  const withMsg = session("msg")
  persistMessage(withMsg, "user", "hi")
  const withDraft = session("draft")
  saveSessionDraft(withDraft, "没发的")
  const withRun = session("run")
  insertRun(getDatabase(), {
    id: "run_prune_run",
    sessionId: withRun,
    workspaceId: "ws_prune",
    kind: "agent",
    status: "failed",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: "x"
  })
  const archived = session("archived")
  getDatabase().prepare("UPDATE sessions SET archived_at = 5 WHERE id = ?").run(archived)
  pruneEmptySessions()
  assert.equal(exists(empty), false)
  assert.equal(exists(withMsg), true)
  assert.equal(exists(withDraft), true)
  assert.equal(exists(withRun), true)
  assert.equal(exists(archived), true)
})

test("离开空会话时 onlyIfEmpty：有草稿不删", () => {
  const sid = session("leave_draft")
  saveSessionDraft(sid, "稿")
  assert.equal(deleteSession(sid, { onlyIfEmpty: true }).deleted, false)
  saveSessionDraft(sid, "")
  assert.equal(deleteSession(sid, { onlyIfEmpty: true }).deleted, true)
})

const { trackSessionRunStart } = await import("./session-run-starting.ts")

function heartbeat(sid: string): void {
  getDatabase()
    .prepare(
      "INSERT INTO session_heartbeats (id, session_id, cron_expr, time_zone, prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(`hb_${sid}`, sid, "0 9 * * *", "Asia/Shanghai", "早报", 1, 1)
}

test("leo BLOCK ④：心跳（从没跑过）/ flagged / 有目标 —— 启动清理与离开删除都保留", () => {
  const hb = session("hb")
  heartbeat(hb)
  const flagged = session("flagged")
  getDatabase().prepare("UPDATE sessions SET flagged = 1 WHERE id = ?").run(flagged)
  const goal = session("goal")
  getDatabase().prepare("UPDATE sessions SET goal = ? WHERE id = ?").run("写周报", goal)
  pruneEmptySessions()
  for (const sid of [hb, flagged, goal]) {
    assert.equal(exists(sid), true, sid)
    assert.equal(deleteSession(sid, { onlyIfEmpty: true }).deleted, false, sid)
  }
})

test("leo BLOCK ④：删会话一并清 heartbeats / drafts / error_dismissed / run_start_git_heads", () => {
  const db = getDatabase()
  const sid = session("cascade")
  heartbeat(sid)
  saveSessionDraft(sid, "稿")
  db.exec("CREATE TABLE IF NOT EXISTS session_error_dismissed (session_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, updated_at INTEGER NOT NULL)")
  db.prepare("INSERT INTO session_error_dismissed VALUES (?, ?, ?)").run(sid, "run_c", 1)
  db.exec("CREATE TABLE IF NOT EXISTS run_start_git_heads (run_id TEXT PRIMARY KEY, head TEXT)")
  insertRun(db, { id: "run_cascade", sessionId: sid, workspaceId: "ws_prune", kind: "agent", status: "failed", modelId: "m", providerId: null, checkpoint: null, error: "x" })
  db.prepare("INSERT INTO run_start_git_heads VALUES (?, ?)").run("run_cascade", "abc")
  deleteSession(sid)
  const left = (sql: string) => (db.prepare(sql).get(sid) as { n: number }).n
  assert.equal(left("SELECT COUNT(*) n FROM session_heartbeats WHERE session_id = ?"), 0)
  assert.equal(left("SELECT COUNT(*) n FROM session_drafts WHERE session_id = ?"), 0)
  assert.equal(left("SELECT COUNT(*) n FROM session_error_dismissed WHERE session_id = ?"), 0)
  assert.equal((db.prepare("SELECT COUNT(*) n FROM run_start_git_heads WHERE run_id = 'run_cascade'").get() as { n: number }).n, 0)
})

test("leo BLOCK ④：run 正在启动 / 落库（runs 行还没写）时 onlyIfEmpty 拒删", async () => {
  const sid = session("starting")
  let release!: () => void
  const gate = new Promise<void>((r) => (release = r))
  const inflight = trackSessionRunStart({ sessionId: sid }, () => gate)
  assert.equal(deleteSession(sid, { onlyIfEmpty: true }).deleted, false)
  release()
  await inflight
  assert.equal(deleteSession(sid, { onlyIfEmpty: true }).deleted, true)
})

test("leo BLOCK ④：草稿表查询出非「no such table」错误 → 当有稿（fail-closed）", () => {
  const sid = session("drafterr")
  const db = getDatabase()
  db.exec("ALTER TABLE session_drafts RENAME COLUMN text TO body")
  try {
    assert.equal(deleteSession(sid, { onlyIfEmpty: true }).deleted, false)
    pruneEmptySessions()
    assert.equal(exists(sid), true)
  } finally {
    db.exec("ALTER TABLE session_drafts RENAME COLUMN body TO text")
  }
})

test("接线：agent.run / ai.generate 都包 trackSessionRunStart", async () => {
  const { readFileSync } = await import("node:fs")
  assert.match(readFileSync(new URL("../ipc-shell.ts", import.meta.url), "utf8"), /trackSessionRunStart\(raw, \(\) => runAgent\(/)
  assert.match(readFileSync(new URL("../ipc-ai.ts", import.meta.url), "utf8"), /trackSessionRunStart\(raw, \(\) => createDesktopRuntime\(/)
})
