/**
 * jojo P1：只粘了图的新会话不是空壳；草稿附件按会话落库，发送带附件时只清本会话。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { getDatabase } = await import("./restore-interrupted-running.behavior.load.ts")
const { pruneEmptySessions, deleteSession } = await import("./session-lifecycle.ts")
const { saveSessionDraftAssets, loadSessionDraftAssets } = await import("./session-drafts.ts")
const { persistUserTurn } = await import("./persist-user-attachments.ts")

function session(id: string): string {
  const db = getDatabase()
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("ws_da", "ws", "/tmp", 1, 1)
  db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(id, "ws_da", "新对话", 1, 1)
  return id
}
const exists = (sid: string) => Boolean(getDatabase().prepare("SELECT 1 FROM sessions WHERE id = ?").get(sid))

test("只粘图（没打字）的会话：启动清理和离开删除都保留；去掉附件后才删", () => {
  const sid = session("ses_da_img")
  saveSessionDraftAssets(sid, [{ id: "ast_x", name: "a.png", mediaType: "image/png" }])
  pruneEmptySessions()
  assert.equal(exists(sid), true)
  assert.equal(deleteSession(sid, { onlyIfEmpty: true }).deleted, false)
  saveSessionDraftAssets(sid, [])
  assert.equal(deleteSession(sid, { onlyIfEmpty: true }).deleted, true)
})

test("草稿附件按会话隔离；带附件发送只清本会话的", () => {
  const a = session("ses_da_a")
  const b = session("ses_da_b")
  saveSessionDraftAssets(a, [{ id: "ast_a", name: "a.png" }])
  saveSessionDraftAssets(b, [{ id: "ast_b", name: "b.png" }])
  persistUserTurn(b, "看图", [{ assetId: "ast_b", mediaType: "image/png", name: "b.png" }])
  const all = loadSessionDraftAssets()
  assert.deepEqual(all[a]?.map((x) => x.id), ["ast_a"])
  assert.equal(all[b], undefined)
})

test("删会话连带清草稿附件", () => {
  const sid = session("ses_da_del")
  saveSessionDraftAssets(sid, [{ id: "ast_d", name: "d.png" }])
  deleteSession(sid)
  assert.equal(loadSessionDraftAssets()[sid], undefined)
})
