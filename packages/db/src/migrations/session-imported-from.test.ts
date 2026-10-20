/**
 * leo #160：v20 sessions.imported_from 的升级 / 回退兼容（改自 leo 的 /tmp/rv160/probe/mig.test.ts）。
 * - v19 带数据升 v20：只跑 v20，原有行和列都在，旧行 imported_from 为 NULL（不回填）。
 * - 旧版应用（只认 ≤ v19）打开 v20 库：不报错、不重跑，新列和值留着，旧代码按显式列写入照常。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations, appliedVersions, MIGRATIONS } from "./runner.ts"
const cols = (db: DatabaseSync) => (db.prepare("PRAGMA table_info(sessions)").all() as Array<Record<string, unknown>>).map((c) => c.name)
function v19WithData() {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((m) => m.version <= 19))
  db.prepare("INSERT INTO workspaces (id,name,root_path,created_at,updated_at) VALUES ('w','w','/tmp',1,1)").run()
  db.prepare("INSERT INTO sessions (id,workspace_id,title,created_at,updated_at,acp_runtime_id,acp_session_id) VALUES ('s_old_import','w','t',1,1,'amp','acp1')").run()
  db.prepare("INSERT INTO sessions (id,workspace_id,title,created_at,updated_at) VALUES ('s_plain','w','t',1,1)").run()
  return db
}
test("v19 with data upgrades to v20 / v19 带数据升到 v20：只跑 20，旧行 imported_from=NULL（未回填），数据保留", () => {
  const db = v19WithData()
  assert.deepEqual(applyMigrations(db), [20])
  assert.ok(cols(db).includes("imported_from"))
  const rows = db.prepare("SELECT id, imported_from, acp_session_id FROM sessions ORDER BY id").all() as Array<Record<string, unknown>>
  assert.equal(rows.length, 2)
  assert.equal(rows.find((r) => r.id === "s_old_import")?.imported_from, null)
  assert.deepEqual(applyMigrations(db), [])
})
test("列已存在（未记账）时 v20 不炸", () => {
  const db = v19WithData()
  db.exec("ALTER TABLE sessions ADD COLUMN imported_from TEXT")
  assert.deepEqual(applyMigrations(db), [20])
})
test("old build reads a v20 DB / 旧版应用（只认 ≤19）打开 v20 库：不拒绝不报错、不重跑、列保留", () => {
  const db = v19WithData()
  applyMigrations(db)
  db.prepare("UPDATE sessions SET imported_from='amp' WHERE id='s_old_import'").run()
  const old = MIGRATIONS.filter((m) => m.version <= 19)
  assert.deepEqual(applyMigrations(db, old), [])
  assert.equal(appliedVersions(db).at(-1), 20)
  assert.equal((db.prepare("SELECT imported_from FROM sessions WHERE id='s_old_import'").get() as { imported_from: string | null }).imported_from, "amp")
  // 旧代码的 INSERT（显式列）仍可用
  db.prepare("INSERT INTO sessions (id, workspace_id, title, created_at, updated_at, flagged) VALUES ('s_new','w','t',1,1,0)").run()
})
test("迁移中途抛错：事务回滚，不记 v20、不留半成品", () => {
  const db = v19WithData()
  const boom: (typeof MIGRATIONS)[number] = { version: 20, name: "session-imported-from", apply(s: DatabaseSync) { s.exec("ALTER TABLE sessions ADD COLUMN imported_from TEXT"); throw new Error("boom") } }
  const list = [...MIGRATIONS.filter((m) => m.version <= 19), boom]
  assert.throws(() => applyMigrations(db, list), /boom/)
  assert.ok(!cols(db).includes("imported_from"), "ALTER 被回滚")
  assert.equal(appliedVersions(db).includes(20), false)
  assert.deepEqual(applyMigrations(db), [20])
})
