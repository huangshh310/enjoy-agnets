/**
 * ALTER ADD COLUMN 的存在性守卫。旧 #119 曾占用 v14，合入 #118 后要能补列、不能重加。
 * #118 的审批 SDK 列是 014；#119 的 cost_missing 是 015。
 */
import type { DatabaseSync } from "node:sqlite"

export const APPROVAL_SDK_COLUMNS = [
  ["request_args", "TEXT"],
  ["sdk_approved", "INTEGER"],
  ["sdk_reason", "TEXT"],
  ["resume_code", "TEXT"],
  ["sdk_approval_id", "TEXT"]
] as const

export const APPROVALS_SDK_IDENTITY_INDEX = "approvals_sdk_identity"

export function tableExists(sqlite: DatabaseSync, name: string): boolean {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name) as { name?: string } | undefined
  return Boolean(row?.name)
}

export function columnExists(sqlite: DatabaseSync, table: string, column: string): boolean {
  if (!tableExists(sqlite, table)) return false
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return cols.some((col) => col.name === column)
}

export function addColumnIfMissing(
  sqlite: DatabaseSync,
  table: string,
  column: string,
  decl: string
): boolean {
  if (!tableExists(sqlite, table) || columnExists(sqlite, table, column)) return false
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`)
  return true
}

export function ensureApprovalSdkColumns(sqlite: DatabaseSync): void {
  for (const [column, decl] of APPROVAL_SDK_COLUMNS) {
    addColumnIfMissing(sqlite, "approvals", column, decl)
  }
  if (tableExists(sqlite, "approvals")) {
    sqlite.exec("UPDATE approvals SET sdk_approval_id = id WHERE sdk_approval_id IS NULL")
  }
  ensureApprovalsSdkIdentityIndex(sqlite)
}

export function ensureApprovalsSdkIdentityIndex(sqlite: DatabaseSync): void {
  if (!tableExists(sqlite, "approvals") || indexExists(sqlite, APPROVALS_SDK_IDENTITY_INDEX)) return
  try {
    sqlite.exec(
      `CREATE UNIQUE INDEX ${APPROVALS_SDK_IDENTITY_INDEX}
        ON approvals (run_id, tool_call_id, COALESCE(sdk_approval_id, id))`
    )
  } catch (error) {
    console.error("approvals_sdk_identity unique index skipped; boot continues", error)
  }
}

function indexExists(sqlite: DatabaseSync, name: string): boolean {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
    .get(name) as { name?: string } | undefined
  return Boolean(row?.name)
}

/** v14 已被记过（旧 cost-missing 或 #118）时，把两边缺的列补齐。 */
export function repairClaimedV14(sqlite: DatabaseSync): void {
  if (!tableExists(sqlite, "schema_migrations")) return
  const row = sqlite
    .prepare("SELECT name FROM schema_migrations WHERE version = 14")
    .get() as { name?: string } | undefined
  if (!row) return
  addColumnIfMissing(sqlite, "telemetry_metrics", "cost_missing", "TEXT")
  ensureApprovalSdkColumns(sqlite)
}

/** v16 已记账或缺跑时补精选 marker 列，禁止重加。 */
export function ensureCuratedPresetIdColumn(sqlite: DatabaseSync): void {
  addColumnIfMissing(sqlite, "mcp_servers", "curated_preset_id", "TEXT")
}
