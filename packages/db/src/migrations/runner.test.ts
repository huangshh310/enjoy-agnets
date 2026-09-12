import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations, appliedVersions } from "./runner.ts"

test("空库依次跑 baseline、ai-runtime、session-archive、secrets-vault 与 inbox-state", () => {
  const db = new DatabaseSync(":memory:")
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [1, 2, 3, 4, 5])
  assert.deepEqual(appliedVersions(db), [1, 2, 3, 4, 5])
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as Array<{ name: string }>
  const names = tables.map((row) => row.name)
  assert.ok(names.includes("schema_migrations"))
  assert.ok(names.includes("runs"))
  assert.ok(names.includes("knowledge_chunks"))
  assert.ok(names.includes("mcp_servers"))
  assert.ok(names.includes("secrets_vault"))
  assert.ok(names.includes("inbox_state"))
})

test("已有 sessions 的旧库补跑后续迁移", () => {
  const db = new DatabaseSync(":memory:")
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [2, 3, 4, 5])
  assert.deepEqual(appliedVersions(db), [1, 2, 3, 4, 5])
})

test("重复 apply 不再执行", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  assert.deepEqual(applyMigrations(db), [])
})
