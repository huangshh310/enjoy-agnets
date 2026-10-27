/**
 * 本机旧库把 v13 记成 retention-indexes（仓库里没有这条迁移，只建过索引）。
 * 现行 v13 是 run-usage-cost。成本列都还不在时丢掉占位记账再升级；列已在则原样冲突。
 */
import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { test } from "node:test"
import { applyMigrations, MIGRATIONS } from "./runner.ts"

const COST: Array<[string, string, string]> = [
  ["runs", "usage_json", "TEXT"],
  ["telemetry_metrics", "cache_read_tokens", "INTEGER"],
  ["telemetry_metrics", "cache_write_tokens", "INTEGER"],
  ["telemetry_metrics", "reasoning_tokens", "INTEGER"],
  ["telemetry_metrics", "estimated_cost_usd", "REAL"],
  ["telemetry_metrics", "cost_status", "TEXT"]
]

/** 官方迁移停在 v12，再记一条本地占位 v13，并留下它建过的索引。 */
function legacyV13(): DatabaseSync {
  const db = new DatabaseSync(":memory:")
  applyMigrations(
    db,
    MIGRATIONS.filter((migration) => migration.version <= 12)
  )
  db.exec("CREATE INDEX idx_telemetry_metrics_created ON telemetry_metrics (created_at)")
  db.prepare(
    "INSERT INTO schema_migrations (version, name, applied_at) VALUES (13, 'retention-indexes', 1)"
  ).run()
  return db
}

function ledger(db: DatabaseSync): string {
  return JSON.stringify(db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all())
}

test("v13=retention-indexes 且成本列缺失：放行现行迁移，索引还在", () => {
  const db = legacyV13()
  db.exec("INSERT INTO workspaces (id, name, root_path, created_at, updated_at) VALUES ('w','w','/w',1,1)")
  db.exec("INSERT INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES ('s','w','t',1,1)")
  assert.deepEqual(applyMigrations(db), [13, 14, 15, 16, 17, 18, 19, 20])
  const row = db.prepare("SELECT name FROM schema_migrations WHERE version = 13").get() as { name: string }
  assert.equal(row.name, "run-usage-cost")
  const index = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_telemetry_metrics_created'")
    .get()
  assert.ok(index)
  const cols = db.prepare("PRAGMA table_info(runs)").all() as Array<{ name: string }>
  assert.ok(cols.some((col) => col.name === "usage_json"))
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM sessions").get() as { n: number }).n, 1)
  assert.deepEqual(applyMigrations(db), [])
})

test("成本列已在时 retention-indexes 仍冲突，记账不删", () => {
  const db = legacyV13()
  for (const [table, column, decl] of COST) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`)
  }
  const before = ledger(db)
  assert.throws(
    () => applyMigrations(db),
    /MIGRATION_VERSION_CONFLICT: v13 applied as retention-indexes, expected run-usage-cost/
  )
  assert.equal(ledger(db), before)
})
