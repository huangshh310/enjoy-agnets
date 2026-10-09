import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations, MIGRATIONS } from "./runner.ts"
import { columnExists } from "./column-guard.ts"

test("cost_missing 已存在时 015 不报错", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((item) => item.version <= 13))
  db.exec("ALTER TABLE telemetry_metrics ADD COLUMN cost_missing TEXT")
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [15])
  assert.equal(columnExists(db, "telemetry_metrics", "cost_missing"), true)
})

test("旧分支把 v14 记成 cost-missing 时补上 #118 的 sdk 列", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((item) => item.version <= 13))
  db.exec("ALTER TABLE telemetry_metrics ADD COLUMN cost_missing TEXT")
  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (14, 'cost-missing', ?)").run(
    Date.now()
  )
  assert.equal(columnExists(db, "approvals", "sdk_approved"), false)
  applyMigrations(db)
  assert.equal(columnExists(db, "telemetry_metrics", "cost_missing"), true)
  assert.equal(columnExists(db, "approvals", "request_args"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approved"), true)
  assert.equal(columnExists(db, "approvals", "sdk_reason"), true)
  assert.equal(columnExists(db, "approvals", "resume_code"), true)
})

test("没有 v14 记账时不提前加 sdk 列，留给 #118", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  assert.equal(columnExists(db, "telemetry_metrics", "cost_missing"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approved"), false)
})
