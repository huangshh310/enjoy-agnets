import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations } from "./runner.ts"
import { cleanMisbackfilledFileParts, misbackfilledFilePartsMigration } from "./misbackfilled-file-parts.ts"

const T = 1_000_000


function fresh(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  db.exec("INSERT INTO workspaces (id, name, root_path, created_at, updated_at) VALUES ('w','w','/w',0,0)")
  return db
}
function session(db: DatabaseSync, id: string) {
  db.prepare("INSERT INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, 'w', ?, 0, 0)").run(id, id)
}
function msg(db: DatabaseSync, id: string, sid: string, at: number) {
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, 'user', 'hi', ?)").run(id, sid, at)
}
function part(db: DatabaseSync, id: string, mid: string, idx: number, type: string, at: number, assetId?: string) {
  const payload = type === "file" ? { type, assetId, mediaType: "image/png", name: "a.png" } : { type, text: "hi" }
  db.prepare("INSERT INTO message_parts (id, message_id, idx, type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, mid, idx, type, JSON.stringify(payload), at)
}
const ids = (db: DatabaseSync) =>
  (db.prepare("SELECT id FROM message_parts ORDER BY id").all() as Array<{ id: string }>).map((r) => r.id)

test("只删跨会话读时回填的 file 部件；正常发送、整条重写、本会话独有的晚写都保留；幂等", () => {
  const db = fresh()
  for (const s of ["A", "B", "C", "D"]) session(db, s)
  // A 正常发图：部件与消息同刻
  msg(db, "mA", "A", T); part(db, "pA0", "mA", 0, "text", T); part(db, "pA1", "mA", 1, "file", T, "ast_x")
  // B 纯文字，之后被回填 ast_x（66s 后，只追加 file）→ 坏行
  msg(db, "mB", "B", T + 10_000); part(db, "pB0", "mB", 0, "text", T + 10_000); part(db, "pB1", "mB", 1, "file", T + 76_000, "ast_x")
  // C 整条重写（checkpoint）：所有部件同刻、晚于消息 → 保留
  msg(db, "mC", "C", T); part(db, "pC0", "mC", 0, "text", T + 60_000); part(db, "pC1", "mC", 1, "file", T + 60_000, "ast_x")
  // D 晚写但 asset 只属于本会话 → 保留
  msg(db, "mD", "D", T); part(db, "pD0", "mD", 0, "text", T); part(db, "pD1", "mD", 1, "file", T + 60_000, "ast_d")
  // 只晚 3s（未过阈值）→ 保留
  session(db, "E"); msg(db, "mE", "E", T + 20_000); part(db, "pE0", "mE", 0, "text", T + 20_000); part(db, "pE1", "mE", 1, "file", T + 23_000, "ast_x")

  // F：同一会话里更早发过 ast_f，后一条晚追加同图 → 不是跨会话，保留
  session(db, "F"); msg(db, "mF1", "F", T); part(db, "pF0", "mF1", 0, "file", T, "ast_f")
  msg(db, "mF2", "F", T + 1000); part(db, "pF1", "mF2", 0, "text", T + 1000); part(db, "pF2", "mF2", 1, "file", T + 90_000, "ast_f")

  assert.equal(cleanMisbackfilledFileParts(db), 1)
  assert.ok(!ids(db).includes("pB1"))
  assert.deepEqual(ids(db), ["pA0", "pA1", "pB0", "pC0", "pC1", "pD0", "pD1", "pE0", "pE1", "pF0", "pF1", "pF2"])
  assert.equal(cleanMisbackfilledFileParts(db), 0, "幂等")
  assert.equal(misbackfilledFilePartsMigration.version, 17)
})
