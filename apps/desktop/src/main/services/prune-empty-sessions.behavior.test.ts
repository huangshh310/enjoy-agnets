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
