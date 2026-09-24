/**
 * 迁移执行器：schema_migrations 记账；已有库若已有 sessions 则记 baseline 已跑。
 */
import type { DatabaseSync } from "node:sqlite"
import { baselineMigration } from "./baseline.ts"
import { aiRuntimeMigration } from "./ai-runtime.ts"
import { sessionArchiveMigration } from "./session-archive.ts"
import { secretsVaultMigration } from "./secrets-vault.ts"
import { inboxStateMigration } from "./inbox-state.ts"
import { sessionWorkflowMigration } from "./session-workflow.ts"
import { runStepsChildRunMigration } from "./run-steps-child-run.ts"
import { workspaceSshMigration } from "./workspace-ssh.ts"
import { sshHostsMigration } from "./ssh-hosts.ts"
import { coreIndexesMigration } from "./core-indexes.ts"
import { acpSessionBindMigration } from "./acp-session-bind.ts"
import { sessionForkHeartbeatMigration } from "./session-fork-heartbeat.ts"
import type { Migration } from "./types.ts"

// 顺序即应用顺序；版本号在各自 migration 的 version 字段里（记入 schema_migrations），文件名不带数字。
export const MIGRATIONS: Migration[] = [
  baselineMigration,
  aiRuntimeMigration,
  sessionArchiveMigration,
  secretsVaultMigration,
  inboxStateMigration,
  sessionWorkflowMigration,
  runStepsChildRunMigration,
  workspaceSshMigration,
  sshHostsMigration,
  coreIndexesMigration,
  acpSessionBindMigration,
  sessionForkHeartbeatMigration
]

function tableExists(sqlite: DatabaseSync, name: string): boolean {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name) as { name?: string } | undefined
  return Boolean(row?.name)
}

function ensureMigrationTable(sqlite: DatabaseSync): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `)
}

/** 早期 ensureTables 建过四张表但没有 schema_migrations。 */
function backfillBaselineIfNeeded(sqlite: DatabaseSync): void {
  if (!tableExists(sqlite, "sessions")) return
  const row = sqlite
    .prepare("SELECT version FROM schema_migrations WHERE version = 1")
    .get() as { version?: number } | undefined
  if (row?.version === 1) return
  sqlite
    .prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (1, 'baseline', ?)")
    .run(Date.now())
}

export function appliedVersions(sqlite: DatabaseSync): number[] {
  if (!tableExists(sqlite, "schema_migrations")) return []
  const rows = sqlite
    .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
    .all() as Array<{ version: number }>
  return rows.map((row) => row.version)
}

export function applyMigrations(sqlite: DatabaseSync, migrations = MIGRATIONS): number[] {
  ensureMigrationTable(sqlite)
  backfillBaselineIfNeeded(sqlite)
  const done = new Set(appliedVersions(sqlite))
  const applied: number[] = []
  for (const migration of migrations) {
    if (done.has(migration.version)) continue
    sqlite.exec("BEGIN")
    try {
      sqlite.exec(migration.sql)
      sqlite
        .prepare(
          "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)"
        )
        .run(migration.version, migration.name, Date.now())
      sqlite.exec("COMMIT")
      applied.push(migration.version)
    } catch (error) {
      sqlite.exec("ROLLBACK")
      throw error
    }
  }
  return applied
}
