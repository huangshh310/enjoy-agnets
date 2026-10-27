/**
 * 本机曾经记过、仓库里没有的占位迁移。
 * v13 `retention-indexes` 只建过索引，版本号后来被 `run-usage-cost` 占用。
 * 成本列都还不在时删掉这条记账，让现行 v13 照常 ALTER；索引留在库里。
 * 列已经在、或名字不在这份名单里：不动库，交给版本冲突守卫。
 */
import type { DatabaseSync } from "node:sqlite"
import { columnExists, tableExists } from "./column-guard.ts"
import type { Migration } from "./types.ts"

const ORPHAN_V13_NAME = "retention-indexes"
const CURRENT_V13_NAME = "run-usage-cost"

/** run-usage-cost 会用裸 ALTER 加上的列。有任一列在，就不能删记账再重跑。 */
const V13_COST_COLUMNS: Array<[table: string, column: string]> = [
  ["runs", "usage_json"],
  ["telemetry_metrics", "cache_read_tokens"],
  ["telemetry_metrics", "cache_write_tokens"],
  ["telemetry_metrics", "reasoning_tokens"],
  ["telemetry_metrics", "estimated_cost_usd"],
  ["telemetry_metrics", "cost_status"]
]

/**
 * 命中已知占位且现行迁移还能安全补列时，删掉占位记账。
 * 返回是否删过。调用方仍走正常迁移，不要在这里改表结构。
 */
export function releaseOrphanLedger(sqlite: DatabaseSync, migrations: Migration[]): boolean {
  if (!tableExists(sqlite, "schema_migrations")) return false
  const current = migrations.find((migration) => migration.version === 13)
  if (current?.name !== CURRENT_V13_NAME) return false
  const row = sqlite.prepare("SELECT name FROM schema_migrations WHERE version = 13").get() as
    | { name?: string }
    | undefined
  if (row?.name !== ORPHAN_V13_NAME) return false
  if (!costColumnsAbsent(sqlite)) return false
  sqlite.prepare("DELETE FROM schema_migrations WHERE version = 13 AND name = ?").run(ORPHAN_V13_NAME)
  return true
}

/** 六列和两张表都在、且列都不存在，裸 ALTER 才能一次加上。 */
function costColumnsAbsent(sqlite: DatabaseSync): boolean {
  if (!tableExists(sqlite, "runs") || !tableExists(sqlite, "telemetry_metrics")) return false
  return V13_COST_COLUMNS.every(([table, column]) => !columnExists(sqlite, table, column))
}
