import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations, MIGRATIONS } from "./runner.ts"
import { columnExists } from "./column-guard.ts"

test("审批 SDK 列已存在时 v14 不报错", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((item) => item.version <= 13))
  db.exec("ALTER TABLE approvals ADD COLUMN request_args TEXT")
  db.exec("ALTER TABLE approvals ADD COLUMN sdk_approved INTEGER")
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [14])
  assert.equal(columnExists(db, "approvals", "request_args"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approved"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approval_id"), true)
})

test("旧分支把 v14 记成 cost-missing 时补上审批 SDK 列", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((item) => item.version <= 13))
  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (14, 'cost-missing', ?)").run(
    Date.now()
  )
  assert.equal(columnExists(db, "approvals", "sdk_approved"), false)
  applyMigrations(db)
  assert.equal(columnExists(db, "approvals", "request_args"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approved"), true)
  assert.equal(columnExists(db, "approvals", "sdk_reason"), true)
  assert.equal(columnExists(db, "approvals", "resume_code"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approval_id"), true)
})

test("没有 v14 记账时不提前加 sdk 列", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((item) => item.version <= 13))
  assert.equal(columnExists(db, "approvals", "sdk_approved"), false)
  assert.equal(columnExists(db, "approvals", "sdk_approval_id"), false)
})
