/**
 * jojo P1：失败 run 落库后可按会话读回，回灌红卡用。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { insertRun, updateRun } from "@enjoy-agents/db"

const { getDatabase } = await import("./restore-interrupted-running.behavior.load.ts")
const { sessionLastError } = await import("./session-last-error.ts")

function session(tag: string): string {
  const db = getDatabase()
  const ws = `ws_err_${tag}`
  const sid = `ses_err_${tag}`
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(ws, "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sid, ws, "e", 1, 1)
  return sid
}

test("最近失败 run 的 error 可读回；回挂码跳过", () => {
  const sid = session("a")
  const db = getDatabase()
  insertRun(db, {
    id: "run_err_old",
    sessionId: sid,
    workspaceId: "ws_err_a",
    kind: "agent",
    status: "failed",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: "old boom",
    createdAt: 1
  })
  insertRun(db, {
    id: "run_err_new",
    sessionId: sid,
    workspaceId: "ws_err_a",
    kind: "agent",
    status: "failed",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: "boom now",
    createdAt: 2
  })
  // updateRun 会 bump updated_at，保证「新」排在前。
  updateRun(db, "run_err_new", { error: "boom now" })
  assert.equal(sessionLastError(sid)?.message, "boom now")
  updateRun(db, "run_err_new", { error: "restore_interrupted_running" })
  assert.equal(sessionLastError(sid)?.message, "old boom")
})

test("没有失败 run / 空会话 → null", () => {
  assert.equal(sessionLastError(session("empty")), null)
})
