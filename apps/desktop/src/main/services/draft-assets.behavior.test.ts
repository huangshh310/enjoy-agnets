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

test("leo：草稿附件在 persistMessage 同一事务里清；外层回滚则草稿附件还在", async () => {
  const { persistMessage } = await import("./persist-session.ts")
  const db = getDatabase()
  const sid = session("ses_da_tx")
  const file = { type: "file", assetId: "ast_t", mediaType: "image/png", name: "t.png" } as never
  saveSessionDraftAssets(sid, [{ id: "ast_t", name: "t.png" }])
  db.exec("BEGIN IMMEDIATE;")
  persistMessage(sid, "user", "图", [file], undefined, { inTransaction: true })
  assert.equal(loadSessionDraftAssets()[sid], undefined, "事务内已清")
  db.exec("ROLLBACK;")
  assert.deepEqual(loadSessionDraftAssets()[sid]?.map((x) => x.id), ["ast_t"], "消息回滚，草稿附件也回来")
  persistMessage(sid, "user", "图", [file])
  assert.equal(loadSessionDraftAssets()[sid], undefined)
})

test("leo：去重跳过（同一句刚落过库）也清草稿附件", () => {
  const sid = session("ses_da_dup")
  const att = [{ assetId: "ast_u", mediaType: "image/png", name: "u.png" }]
  persistUserTurn(sid, "再看", att)
  saveSessionDraftAssets(sid, [{ id: "ast_u", name: "u.png" }])
  persistUserTurn(sid, "再看", att)
  const n = getDatabase().prepare("SELECT COUNT(*) as n FROM messages WHERE session_id = ?").get(sid) as { n: number }
  assert.equal(n.n, 1, "第二次被去重跳过")
  assert.equal(loadSessionDraftAssets()[sid], undefined)
})
