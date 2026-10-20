/**
 * leo soft（#135）：早期 #135 测试包把 session-review 记成 v17、run-discarded-pre-output 记成 v18。
 * main 的 v17 是 misbackfilled-file-parts，#135 现编号 v18 / v19。旧测试包的库必须报版本冲突并原样不动，
 * 不能静默跳过或重复建列。
 */
import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations, appliedVersions, MIGRATIONS } from "./runner.ts"

test("旧 #135 测试包库（v17=session-review, v18=run-discarded）→ 版本冲突，库不动", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((m) => m.version <= 16))
  db.exec(
    "ALTER TABLE sessions ADD COLUMN review_changed_files TEXT; ALTER TABLE sessions ADD COLUMN review_completed_at TEXT; ALTER TABLE runs ADD COLUMN discarded_pre_output INTEGER NOT NULL DEFAULT 0"
  )
  db.prepare(
    "INSERT INTO schema_migrations (version,name,applied_at) VALUES (17,'session-review',1),(18,'run-discarded-pre-output',1)"
  ).run()
  const before = JSON.stringify(db.prepare("SELECT * FROM schema_migrations ORDER BY version").all())
  assert.throws(
    () => applyMigrations(db),
    /MIGRATION_VERSION_CONFLICT: v17 applied as session-review, expected misbackfilled-file-parts/
  )
  assert.equal(JSON.stringify(db.prepare("SELECT * FROM schema_migrations ORDER BY version").all()), before)
})

test("main 库升到 #135：只补 v18 / v19，列已存在也不炸，再跑一遍是空操作", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((m) => m.version <= 17))
  db.exec("ALTER TABLE runs ADD COLUMN discarded_pre_output INTEGER NOT NULL DEFAULT 0")
  const upTo135 = MIGRATIONS.filter((m) => m.version <= 19)
  assert.deepEqual(applyMigrations(db, upTo135), [18, 19])
  assert.deepEqual(applyMigrations(db, upTo135), [])
  assert.equal(appliedVersions(db).at(-1), 19)
})
