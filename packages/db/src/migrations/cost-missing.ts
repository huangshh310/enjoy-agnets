/**
 * 指标补 cost_missing。列已在就跳过（旧 #119 曾把这列写进 v14）。
 */
import { addColumnIfMissing } from "./column-guard.ts"
import type { Migration } from "./types.ts"

export const costMissingMigration: Migration = {
  version: 15,
  name: "cost-missing",
  apply(sqlite) {
    addColumnIfMissing(sqlite, "telemetry_metrics", "cost_missing", "TEXT")
  }
}
