/**
 * luna P3：生成失败的会话不进侧栏「进行中」（与 jojo P2a 同规则）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const { getDatabase } = await import("./restore-interrupted-running.behavior.load.ts")
const { generationFailedTurn } = await import("./generation-failed-turn.ts")

function session(tag: string, workflow: string): string {
  const db = getDatabase()
  const ws = `ws_genfail_${tag}`
  const sid = `ses_genfail_${tag}`
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(ws, "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sid, ws, "g", 1, 1)
  db.prepare("UPDATE sessions SET workflow_status = ? WHERE id = ?").run(workflow, sid)
  return sid
}

function workflowOf(sid: string): string {
  return (getDatabase().prepare("SELECT workflow_status AS w FROM sessions WHERE id = ?").get(sid) as { w: string }).w
}

test("生成失败：进行中 → 待办（库 + 事件 turn 一致），红卡语义 error", () => {
  const sid = session("a", "in_progress")
  const turn = generationFailedTurn(sid)
  assert.deepEqual(turn, { workflow: "todo", attention: "error" })
  assert.equal(workflowOf(sid), "todo")
})

test("生成失败：待验收粘性不被擦", () => {
  const sid = session("b", "needs_review")
  assert.equal(generationFailedTurn(sid).workflow, "needs_review")
  assert.equal(workflowOf(sid), "needs_review")
})

test("接线：ai-generation 失败走 generationFailedTurn，不再硬写 in_progress", () => {
  const src = readFileSync(new URL("./ai-generation.ts", import.meta.url), "utf8")
  assert.match(src, /turn: generationFailedTurn\(request\.sessionId\)/)
  assert.doesNotMatch(src, /workflow: "in_progress", attention: "error"/)
})

test("接线：automations-run 失败走 generationFailedTurn，不再硬写 in_progress", () => {
  const auto = readFileSync(new URL("./automations-run.ts", import.meta.url), "utf8")
  assert.match(auto, /turn: generationFailedTurn\(openedSessionId\)/)
  assert.doesNotMatch(auto, /workflow: "in_progress", attention: "error"/)
})
