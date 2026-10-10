import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations, MIGRATIONS } from "./runner.ts"
import {
  columnExists,
  ensureApprovalsSdkIdentityIndex,
  repairClaimedV14
} from "./column-guard.ts"

test("cost_missing 已存在时 015 不报错", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((item) => item.version <= 13))
  db.exec("ALTER TABLE telemetry_metrics ADD COLUMN cost_missing TEXT")
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [14, 15])
  assert.equal(columnExists(db, "telemetry_metrics", "cost_missing"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approval_id"), true)
})

test("审批 SDK 列已存在时 v14 不报错", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((item) => item.version <= 13))
  db.exec("ALTER TABLE approvals ADD COLUMN request_args TEXT")
  db.exec("ALTER TABLE approvals ADD COLUMN sdk_approved INTEGER")
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [14, 15])
  assert.equal(columnExists(db, "approvals", "request_args"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approved"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approval_id"), true)
  assert.equal(columnExists(db, "telemetry_metrics", "cost_missing"), true)
})

test("旧分支把 v14 记成 cost-missing 时补上审批 SDK 列", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((item) => item.version <= 13))
  db.exec("ALTER TABLE telemetry_metrics ADD COLUMN cost_missing TEXT")
  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (14, 'cost-missing', ?)").run(
    Date.now()
  )
  assert.equal(columnExists(db, "approvals", "sdk_approved"), false)
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [15])
  assert.equal(columnExists(db, "telemetry_metrics", "cost_missing"), true)
  assert.equal(columnExists(db, "approvals", "request_args"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approved"), true)
  assert.equal(columnExists(db, "approvals", "sdk_reason"), true)
  assert.equal(columnExists(db, "approvals", "resume_code"), true)
  assert.equal(columnExists(db, "approvals", "sdk_approval_id"), true)
  const indexes = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'approvals_sdk_identity'")
    .all() as Array<{ name: string }>
  assert.equal(indexes.length, 1)
  assert.deepEqual(applyMigrations(db), [])
})

test("库里有重复三元组时建 UNIQUE 不挡住启动", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  db.exec("DROP INDEX IF EXISTS approvals_sdk_identity")
  db.exec(`
    INSERT INTO approvals (id, run_id, tool_call_id, name, args, hmac, decision, created_at, sdk_approval_id)
    VALUES
      ('apr_a', 'run_dup', 'tool_dup', 'write_file', '{}', 'h', NULL, 1, 'apr_sdk'),
      ('apr_b', 'run_dup', 'tool_dup', 'write_file', '{}', 'h', NULL, 2, 'apr_sdk')
  `)
  assert.doesNotThrow(() => repairClaimedV14(db))
  assert.doesNotThrow(() => ensureApprovalsSdkIdentityIndex(db))
})

test("没有 v14 记账时不提前加 sdk 列", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db, MIGRATIONS.filter((item) => item.version <= 13))
  assert.equal(columnExists(db, "approvals", "sdk_approved"), false)
  assert.equal(columnExists(db, "approvals", "sdk_approval_id"), false)
  assert.equal(columnExists(db, "telemetry_metrics", "cost_missing"), false)
})
