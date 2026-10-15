/**
 * #155 leo MUST 2：8s 内连发两张不同的图（正文都为空），第二条不能被当重复跳过（旧键只看正文 → 不落库却清了稿）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { insertAsset } from "@enjoy-agents/db"

const { getDatabase } = await import("./restore-interrupted-running.behavior.load.ts")
const { persistUserTurn } = await import("./persist-user-attachments.ts")

function session(id: string): void {
  const db = getDatabase()
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    "ws_img_dedupe", "ws", "/tmp", 1, 1
  )
  db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    id, "ws_img_dedupe", "t", 1, 1
  )
}

function asset(id: string, name: string): { assetId: string; mediaType: string; name: string } {
  insertAsset(getDatabase(), { id, name, kind: "image", mediaType: "image/png", size: 1, hash: id, source: "import", createdAt: Date.now() })
  return { assetId: id, mediaType: "image/png", name }
}

const userRows = (sid: string) =>
  (getDatabase().prepare("SELECT id FROM messages WHERE session_id = ? AND role = 'user'").all(sid) as unknown[]).length

test("8s 内两次只图发送、图不同：两条都落库", () => {
  session("ses_img_dd")
  persistUserTurn("ses_img_dd", "", [asset("ast_dd_1", "1.png")])
  persistUserTurn("ses_img_dd", "", [asset("ast_dd_2", "2.png")])
  assert.equal(userRows("ses_img_dd"), 2)
})

test("8s 内同正文同一张图：仍按重复跳过（连点保护不变）", () => {
  session("ses_img_dd2")
  const a = asset("ast_dd_same", "s.png")
  persistUserTurn("ses_img_dd2", "", [a])
  persistUserTurn("ses_img_dd2", "", [a])
  assert.equal(userRows("ses_img_dd2"), 1)
})
