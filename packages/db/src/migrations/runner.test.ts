import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { applyMigrations, appliedVersions } from "./runner.ts"

test("空库依次跑全部迁移至 12（含分叉与会话心跳）", () => {
  const db = new DatabaseSync(":memory:")
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  assert.deepEqual(appliedVersions(db), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
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

  // 验证 sessions 新字段
  const sessionCols = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>
  const sColNames = sessionCols.map((c) => c.name)
  assert.ok(sColNames.includes("flagged"))
  assert.ok(sColNames.includes("workflow_status"))
  assert.ok(sColNames.includes("goal"))
  assert.ok(sColNames.includes("recap"))
  assert.ok(sColNames.includes("acp_runtime_id"))
  assert.ok(sColNames.includes("acp_session_id"))
  assert.ok(sColNames.includes("forked_from"))
  assert.ok(names.includes("session_heartbeats"))

  // 验证 run_steps 新字段
  const stepCols = db.prepare("PRAGMA table_info(run_steps)").all() as Array<{ name: string }>
  const stepColNames = stepCols.map((c) => c.name)
  assert.ok(stepColNames.includes("child_run_id"))

  const wsCols = db.prepare("PRAGMA table_info(workspaces)").all() as Array<{ name: string }>
  const wsNames = wsCols.map((c) => c.name)
  assert.ok(wsNames.includes("kind"))
  assert.ok(wsNames.includes("ssh_host"))
  assert.ok(wsNames.includes("remote_path"))
  assert.ok(wsNames.includes("ssh_host_id"))
  assert.ok(names.includes("ssh_hosts"))
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
    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      root_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
  const applied = applyMigrations(db)
  assert.deepEqual(applied, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  assert.deepEqual(appliedVersions(db), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
})

test("重复 apply 不再执行", () => {
  const db = new DatabaseSync(":memory:")
  applyMigrations(db)
  assert.deepEqual(applyMigrations(db), [])
})
