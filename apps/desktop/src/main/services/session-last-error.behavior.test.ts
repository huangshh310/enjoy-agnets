/**
 * jojo P1：失败 run 落库后可按会话读回，回灌红卡用。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { insertRun, updateRun } from "@enjoy-agents/db"

const { getDatabase } = await import("./restore-interrupted-running.behavior.load.ts")
const { dismissSessionError, redactRunError, sessionLastError } = await import("./session-last-error.ts")

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
  // host：最近一轮是回挂 / 续跑码 → 交给中断提示，不回退到更早的失败。
  updateRun(db, "run_err_new", { error: "restore_interrupted_running" })
  assert.equal(sessionLastError(sid), null)
})

function run(sid: string, id: string, status: "failed" | "completed", error: string | null, at: number) {
  insertRun(getDatabase(), {
    id,
    sessionId: sid,
    workspaceId: `ws_err_${sid.slice(8)}`,
    kind: "agent",
    status,
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error,
    createdAt: at
  })
  getDatabase().prepare("UPDATE runs SET updated_at = ? WHERE id = ?").run(at, id)
}

test("leo：失败 → 成功 → 重启 = 没卡（只看最近一轮）", () => {
  const sid = session("ok_after")
  run(sid, "run_oa_1", "failed", "boom", 10)
  run(sid, "run_oa_2", "completed", null, 20)
  assert.equal(sessionLastError(sid), null)
})

test("leo：关卡落水位 → 重启不再还原；更新的失败照出", () => {
  const sid = session("dismiss")
  run(sid, "run_ds_1", "failed", "boom", 10)
  assert.equal(sessionLastError(sid)?.runId, "run_ds_1")
  dismissSessionError(sid)
  assert.equal(sessionLastError(sid), null)
  run(sid, "run_ds_2", "failed", "boom2", 20)
  assert.equal(sessionLastError(sid)?.runId, "run_ds_2")
})

test("leo：归档会话没卡", () => {
  const sid = session("archived")
  run(sid, "run_ar_1", "failed", "boom", 10)
  getDatabase().prepare("UPDATE sessions SET archived_at = 5 WHERE id = ?").run(sid)
  assert.equal(sessionLastError(sid), null)
})

test("leo：error 去栈 / 去路径 / 去 token 并截断", () => {
  const sid = session("redact")
  const raw = `Error: failed reading /Users/al/secret/proj/a.ts with key sk-abcdefghijklmnop1234\n    at foo (/x/y.js:1:2)\n    at bar`
  run(sid, "run_rd_1", "failed", raw, 10)
  const msg = sessionLastError(sid)?.message ?? ""
  assert.match(msg, /^Error: failed reading/)
  assert.doesNotMatch(msg, /Users|sk-abc|\bat foo|y\.js/)
  assert.ok(redactRunError("x".repeat(1000)).length <= 300)
  assert.ok(redactRunError("e ".repeat(400)).length <= 300)
})

test("没有失败 run / 空会话 → null", () => {
  assert.equal(sessionLastError(session("empty")), null)
})

test("leo #151：dismissError 的 runId 必须是本会话最近一轮失败；过期 / 别的会话不落水位", () => {
  const sid = session("stale")
  const other = session("stale_other")
  run(sid, "run_st_1", "failed", "boom1", 10)
  run(sid, "run_st_2", "failed", "boom2", 20)
  run(other, "run_so_1", "failed", "x", 30)
  assert.equal(dismissSessionError(sid, "run_st_1"), false)
  assert.equal(dismissSessionError(sid, "run_so_1"), false)
  assert.equal(sessionLastError(sid)?.runId, "run_st_2")
  assert.equal(dismissSessionError(sid, "run_st_2"), true)
  assert.equal(sessionLastError(sid), null)
})

test("leo #151：ipc 有 ENJOY_E2E_DISMISS_ERROR=fail 桩，关卡恒失败", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("../ipc-session.ts", import.meta.url), "utf8")
  assert.match(src, /ENJOY_E2E_DISMISS_ERROR === "fail"\) return false/)
})
