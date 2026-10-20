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
import { runUsageCostMigration } from "./run-usage-cost.ts"
import { approvalSdkResponseMigration } from "./approval-sdk-response.ts"
import { costMissingMigration } from "./cost-missing.ts"
import { mcpCuratedMigration } from "./mcp-curated.ts"
import { misbackfilledFilePartsMigration } from "./misbackfilled-file-parts.ts"
import { sessionReviewMigration } from "./session-review.ts"
import { runDiscardedPreOutputMigration } from "./run-discarded-pre-output.ts"
import { sessionImportedFromMigration } from "./session-imported-from.ts"
import { ensureCuratedPresetIdColumn, repairClaimedV14, tableExists } from "./column-guard.ts"
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
  sessionForkHeartbeatMigration,
  runUsageCostMigration,
  approvalSdkResponseMigration,
  costMissingMigration,
  mcpCuratedMigration,
  misbackfilledFilePartsMigration,
  sessionReviewMigration,
  runDiscardedPreOutputMigration,
  sessionImportedFromMigration
]

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

/** 历史上已知的同号异名（旧 #119 把 v14 记成 cost-missing，由 repairClaimedV14 补列）。 */
const LEGACY_NAME_ALIASES: Record<number, string[]> = { 14: ["cost-missing"] }

/**
 * 迁移编号守卫：同一版本号对应不同名字 → 直接抛（并行 PR 撞号时宁可起不来，也不跳过别人的迁移）。
 * 既查迁移表本身，也查库里已记账的版本。
 */
export function assertMigrationIdentity(sqlite: DatabaseSync, migrations: Migration[]): void {
  const byVersion = new Map<number, string>()
  for (const migration of migrations) {
    const seen = byVersion.get(migration.version)
    if (seen !== undefined && seen !== migration.name) {
      throw new Error(`MIGRATION_VERSION_CONFLICT: v${migration.version} ${seen} vs ${migration.name}`)
    }
    byVersion.set(migration.version, migration.name)
  }
  if (!tableExists(sqlite, "schema_migrations")) return
  const rows = sqlite.prepare("SELECT version, name FROM schema_migrations").all() as Array<{
    version: number
    name: string
  }>
  for (const row of rows) {
    const expected = byVersion.get(row.version)
    if (expected === undefined || expected === row.name) continue
    if (LEGACY_NAME_ALIASES[row.version]?.includes(row.name)) continue
    throw new Error(`MIGRATION_VERSION_CONFLICT: v${row.version} applied as ${row.name}, expected ${expected}`)
  }
}

export function applyMigrations(sqlite: DatabaseSync, migrations = MIGRATIONS): number[] {
  ensureMigrationTable(sqlite)
  backfillBaselineIfNeeded(sqlite)
  assertMigrationIdentity(sqlite, migrations)
  const done = new Set(appliedVersions(sqlite))
  const applied: number[] = []
  for (const migration of migrations) {
    if (done.has(migration.version)) continue
    sqlite.exec("BEGIN")
    try {
      runMigration(sqlite, migration)
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
  repairClaimedV14(sqlite)
  ensureCuratedPresetIdColumn(sqlite)
  return applied
}

function runMigration(sqlite: DatabaseSync, migration: Migration): void {
  if (migration.apply) {
    migration.apply(sqlite)
    return
  }
  if (migration.sql) sqlite.exec(migration.sql)
}
