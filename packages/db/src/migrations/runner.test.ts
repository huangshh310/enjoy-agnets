import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations, appliedVersions } from "./runner.ts"

test("空库依次跑 baseline 与 ai-runtime", () => {
  const db = new DatabaseSync(":memory:")
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [1, 2])
  assert.deepEqual(appliedVersions(db), [1, 2])
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as Array<{ name: string }>
  const names = tables.map((row) => row.name)
  assert.ok(names.includes("schema_migrations"))
  assert.ok(names.includes("runs"))
  assert.ok(names.includes("knowledge_chunks"))
  assert.ok(names.includes("mcp_servers"))
})

test("已有 sessions 的旧库只补跑 ai-runtime", () => {
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
  assert.deepEqual(applied, [2])
  assert.deepEqual(appliedVersions(db), [1, 2])
})

test("重复 apply 不再执行", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  assert.deepEqual(applyMigrations(db), [])
})
