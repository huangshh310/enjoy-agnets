/**
 * jojo P1/P2：草稿落 DB；用户消息落库的同一事务清掉已发出的稿。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { getDatabase, persistMessage } = await import("./restore-interrupted-running.behavior.load.ts")
const { draftWasSent, loadSessionDrafts, saveSessionDraft } = await import("./session-drafts.ts")

function session(tag: string): string {
  const db = getDatabase()
  const ws = `ws_draft_${tag}`
  const sid = `ses_draft_${tag}`
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(ws, "ws", "/tmp", 1, 1)
  db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(sid, ws, "d", 1, 1)
  return sid
}

test("草稿按会话存进 DB、读回；清空即删", () => {
  const a = session("a")
  const b = session("b")
  saveSessionDraft(a, "A 没发的")
  saveSessionDraft(b, "B 没发的")
  assert.equal(loadSessionDrafts()[a], "A 没发的")
  assert.equal(loadSessionDrafts()[b], "B 没发的")
  saveSessionDraft(a, "")
  assert.equal(loadSessionDrafts()[a], undefined)
})

test("P2：用户消息落库（Enter 后 1.5s 强杀前已落库）→ 同一步清掉这份稿，重启不再冒出来", () => {
  const sid = session("sent")
  saveSessionDraft(sid, "修登录页")
  persistMessage(sid, "user", "修登录页")
  assert.equal(loadSessionDrafts()[sid], undefined)
})

test("leo：只有完全相同才清——以短稿结尾的长消息不删短稿", () => {
  const sid = session("suffix")
  saveSessionDraft(sid, "好")
  persistMessage(sid, "user", "这样就好")
  assert.equal(loadSessionDrafts()[sid], "好")
})

test("P2：0.3s 强杀（消息还没落库）→ 稿还在；落的是别的内容 / 助手消息也不清", () => {
  const sid = session("kept")
  saveSessionDraft(sid, "后打的 B")
  assert.equal(loadSessionDrafts()[sid], "后打的 B")
  persistMessage(sid, "user", "先发的 A")
  persistMessage(sid, "assistant", "后打的 B")
  assert.equal(loadSessionDrafts()[sid], "后打的 B")
})

test("draftWasSent：空稿不算", () => {
  assert.equal(draftWasSent("", "x"), false)
  assert.equal(draftWasSent("  a ", "a"), true)
  assert.equal(draftWasSent("a", "b"), false)
  assert.equal(draftWasSent("a", "xa"), false)
})
