import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations, assertMigrationIdentity, MIGRATIONS } from "./runner.ts"
import {
  MISBACKFILL_REASON,
  misbackfilledFilePartsMigration,
  quarantineMisbackfilledFileParts
} from "./misbackfilled-file-parts.ts"

const T = 10_000_000

function fresh(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  db.exec("INSERT INTO workspaces (id, name, root_path, created_at, updated_at) VALUES ('w','w','/w',0,0)")
  return db
}
function session(db: DatabaseSync, id: string) {
  db.prepare("INSERT INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, 'w', ?, 0, 0)").run(id, id)
}
function asset(db: DatabaseSync, id: string, at: number) {
  db.prepare(
    "INSERT INTO assets (id, name, kind, media_type, size, hash, source, created_at) VALUES (?, 'a.png', 'image', 'image/png', 1, ?, 'import', ?)"
  ).run(id, id, at)
}
function msg(db: DatabaseSync, id: string, sid: string, at: number) {
  db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, 'user', 'hi', ?)").run(id, sid, at)
}
function part(db: DatabaseSync, id: string, mid: string, idx: number, type: string, at: number, assetId?: string) {
  const payload = type === "file" ? { type, assetId, mediaType: "image/png", name: "a.png" } : { type, text: "hi" }
  db.prepare("INSERT INTO message_parts (id, message_id, idx, type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, mid, idx, type, JSON.stringify(payload), at)
}
const partIds = (db: DatabaseSync) =>
  (db.prepare("SELECT id FROM message_parts ORDER BY id").all() as Array<{ id: string }>).map((r) => r.id)

/** 原会话 A 在 T 正常发了图 ast（T-30s 导入）。 */
function withOrigin(db: DatabaseSync, ast = "ast_x") {
  asset(db, ast, T - 30_000)
  session(db, "A")
  msg(db, "mA", "A", T)
  part(db, "pA0", "mA", 0, "text", T)
  part(db, "pA1", "mA", 1, "file", T, ast)
}

test("跨会话读时回填：整行搬进隔离表（原行 + reason + migratedAt），不硬删；幂等", () => {
  const db = fresh()
  withOrigin(db)
  session(db, "B")
  msg(db, "mB", "B", T + 10_000)
  part(db, "pB0", "mB", 0, "text", T + 10_000)
  part(db, "pB1", "mB", 1, "file", T + 76_000, "ast_x")
  assert.equal(quarantineMisbackfilledFileParts(db, 42), 1)
  assert.deepEqual(partIds(db), ["pA0", "pA1", "pB0"])
  const q = db.prepare("SELECT * FROM message_parts_quarantine").all() as Array<Record<string, unknown>>
  assert.equal(q.length, 1)
  assert.deepEqual(
    { ...q[0] },
    {
      id: "pB1",
      message_id: "mB",
      idx: 1,
      type: "file",
      payload: JSON.stringify({ type: "file", assetId: "ast_x", mediaType: "image/png", name: "a.png" }),
      created_at: T + 76_000,
      reason: MISBACKFILL_REASON,
      migrated_at: 42
    }
  )
  assert.equal(quarantineMisbackfilledFileParts(db), 0, "幂等")
  assert.equal(misbackfilledFilePartsMigration.version, 17)
})

test("批量上传：同一消息已有随消息写入的 file，后写的 file（>5s）保留", () => {
  const db = fresh()
  withOrigin(db)
  session(db, "B")
  asset(db, "ast_b1", T)
  msg(db, "mB", "B", T + 10_000)
  part(db, "pB0", "mB", 0, "text", T + 10_000)
  part(db, "pB1", "mB", 1, "file", T + 10_000, "ast_b1")
  part(db, "pB2", "mB", 2, "file", T + 20_000, "ast_x")
  assert.equal(quarantineMisbackfilledFileParts(db), 0)
})

test("正常重复发送：同一张图在另一个会话随消息再发一次，保留", () => {
  const db = fresh()
  withOrigin(db)
  session(db, "B")
  msg(db, "mB", "B", T + 10_000)
  part(db, "pB0", "mB", 0, "text", T + 10_000)
  part(db, "pB1", "mB", 1, "file", T + 10_000, "ast_x")
  // 本会话后一条又被晚挂同图：本会话正常选用过这张图 → 也保留
  msg(db, "mB2", "B", T + 20_000)
  part(db, "pB2", "mB2", 0, "text", T + 20_000)
  part(db, "pB3", "mB2", 1, "file", T + 90_000, "ast_x")
  assert.equal(quarantineMisbackfilledFileParts(db), 0)
})

test("「另一个会话更早」时间条件：别的会话的引用晚于本部件 → 保留", () => {
  const db = fresh()
  asset(db, "ast_x", T - 30_000)
  session(db, "B")
  msg(db, "mB", "B", T)
  part(db, "pB0", "mB", 0, "text", T)
  part(db, "pB1", "mB", 1, "file", T + 60_000, "ast_x")
  session(db, "A")
  msg(db, "mA", "A", T + 100_000)
  part(db, "pA0", "mA", 0, "file", T + 100_000, "ast_x")
  assert.equal(quarantineMisbackfilledFileParts(db), 0)
})

test("资产库复用：图在消息前 120s 之外导入（旧图被复用）→ 保留", () => {
  const db = fresh()
  asset(db, "ast_old", T - 600_000)
  session(db, "A")
  msg(db, "mA", "A", T)
  part(db, "pA0", "mA", 0, "file", T, "ast_old")
  session(db, "B")
  msg(db, "mB", "B", T + 10_000)
  part(db, "pB0", "mB", 0, "text", T + 10_000)
  part(db, "pB1", "mB", 1, "file", T + 60_000, "ast_old")
  assert.equal(quarantineMisbackfilledFileParts(db), 0)
})

test("本会话草稿附件里选过这张图 → 保留", () => {
  const db = fresh()
  withOrigin(db)
  session(db, "B")
  msg(db, "mB", "B", T + 10_000)
  part(db, "pB0", "mB", 0, "text", T + 10_000)
  part(db, "pB1", "mB", 1, "file", T + 76_000, "ast_x")
  db.exec("CREATE TABLE session_draft_assets (session_id TEXT PRIMARY KEY, assets_json TEXT NOT NULL, updated_at INTEGER NOT NULL)")
  db.prepare("INSERT INTO session_draft_assets VALUES ('B', ?, 0)").run(JSON.stringify([{ id: "ast_x", name: "a.png" }]))
  assert.equal(quarantineMisbackfilledFileParts(db), 0)
})

test("整条重写、只晚 3s、图原属本会话 → 都保留", () => {
  const db = fresh()
  withOrigin(db)
  session(db, "C")
  msg(db, "mC", "C", T + 5_000)
  part(db, "pC0", "mC", 0, "text", T + 60_000)
  part(db, "pC1", "mC", 1, "file", T + 60_000, "ast_x")
  session(db, "E")
  msg(db, "mE", "E", T + 20_000)
  part(db, "pE0", "mE", 0, "text", T + 20_000)
  part(db, "pE1", "mE", 1, "file", T + 23_000, "ast_x")
  // 图最早挂在本会话 A：A 后一条晚挂 → 不是跨会话
  msg(db, "mA2", "A", T + 1_000)
  part(db, "pA2", "mA2", 0, "text", T + 1_000)
  part(db, "pA3", "mA2", 1, "file", T + 90_000, "ast_x")
  assert.equal(quarantineMisbackfilledFileParts(db), 0)
})

test("迁移编号守卫：同号异名抛错（迁移表内 / 库里已记账）；已知旧别名放行", () => {
  const dup = [...MIGRATIONS, { version: 17, name: "someone-else", sql: "SELECT 1" }]
  assert.throws(() => applyMigrations(new DatabaseSync(":memory:"), dup), /MIGRATION_VERSION_CONFLICT/)
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((m) => m.version <= 16))
  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (17, 'other-pr-v17', 0)").run()
  assert.throws(() => applyMigrations(db), /v17 applied as other-pr-v17, expected misbackfilled-file-parts/)
  const legacy = new DatabaseSync(":memory:")
  applyMigrations(legacy, MIGRATIONS.filter((m) => m.version <= 13))
  legacy.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (14, 'cost-missing', 0)").run()
  assert.doesNotThrow(() => assertMigrationIdentity(legacy, MIGRATIONS))
})

test("leo M1a：图在消息之后才导入（窗口上界）→ 保留", () => {
  const db = fresh()
  asset(db, "ast_late", T + 15_000)
  session(db, "A")
  msg(db, "mA", "A", T + 15_000)
  part(db, "pA0", "mA", 0, "file", T + 15_000, "ast_late")
  session(db, "B")
  msg(db, "mB", "B", T + 10_000)
  part(db, "pB0", "mB", 0, "text", T + 10_000)
  part(db, "pB1", "mB", 1, "file", T + 76_000, "ast_late")
  assert.equal(quarantineMisbackfilledFileParts(db), 0)
})

test("leo M1b：v14 记成既非 cost-missing 也非当前名 → 抛错", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((m) => m.version <= 13))
  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (14, 'mystery-v14', 0)").run()
  assert.throws(() => applyMigrations(db), /v14 applied as mystery-v14, expected approval-sdk-response/)
})
