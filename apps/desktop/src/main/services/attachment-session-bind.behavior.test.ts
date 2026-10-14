/**
 * jojo P1（#151 gate3）：A 会话的图片被写成 B 会话用户消息的 file part（切换 / 重启时列消息才写）。
 * 真因：listMessages → backfillUserFileParts 按全局导入时间窗把「本会话没挂过」的资产补进纯文本用户轮。
 * 附件只在发送时随消息落库；列消息绝不改库、绝不跨会话挂附件。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { insertAsset } from "@enjoy-agents/db"

const { getDatabase, persistMessage } = await import("./restore-interrupted-running.behavior.load.ts")
const { listMessages } = await import("./session-queries.ts")

function session(id: string): void {
  const db = getDatabase()
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    "ws_bind", "ws", "/tmp", 1, 1
  )
  db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    id, "ws_bind", "t", 1, 1
  )
}

const fileParts = (sid: string) =>
  (getDatabase()
    .prepare("SELECT p.payload FROM message_parts p JOIN messages m ON m.id = p.message_id WHERE m.session_id = ? AND p.type = 'file'")
    .all(sid) as Array<{ payload: string }>).map((r) => (JSON.parse(r.payload) as { assetId: string }).assetId)

test("A 发过的图 / A 草稿里的图：切到 B、重启列 B 消息，都不进 B 的用户轮", async () => {
  session("ses_bind_a")
  session("ses_bind_b")
  const now = Date.now()
  insertAsset(getDatabase(), { id: "ast_bind_sent", name: "a.png", kind: "image", mediaType: "image/png", size: 1, hash: "h1", source: "import", createdAt: now - 5_000 })
  insertAsset(getDatabase(), { id: "ast_bind_draft", name: "d.png", kind: "image", mediaType: "image/png", size: 1, hash: "h2", source: "import", createdAt: now - 4_000 })
  persistMessage("ses_bind_a", "user", "看看这张图", [
    { type: "text", text: "看看这张图" },
    { type: "file", assetId: "ast_bind_sent", mediaType: "image/png", name: "a.png" }
  ] as never)
  persistMessage("ses_bind_b", "user", "stub store error")
  const listed = await listMessages("ses_bind_b")
  assert.deepEqual(fileParts("ses_bind_b"), [])
  const user = listed.find((m) => m.role === "user")!
  assert.equal((user.parts as Array<{ type: string }>).some((p) => p.type === "file"), false)
  assert.deepEqual(fileParts("ses_bind_a"), ["ast_bind_sent"])
})
