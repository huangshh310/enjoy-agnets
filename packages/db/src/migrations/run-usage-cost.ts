/**
 * 每次 run 的 usage 分项与 telemetry 估算字段。缺项保持 NULL，不要回填 0。
 */
import type { Migration } from "./types.ts"

export const runUsageCostMigration: Migration = {
  version: 13,
  name: "run-usage-cost",
  sql: `
    ALTER TABLE runs ADD COLUMN usage_json TEXT;
    ALTER TABLE telemetry_metrics ADD COLUMN cache_read_tokens INTEGER;
    ALTER TABLE telemetry_metrics ADD COLUMN cache_write_tokens INTEGER;
    ALTER TABLE telemetry_metrics ADD COLUMN reasoning_tokens INTEGER;
    ALTER TABLE telemetry_metrics ADD COLUMN estimated_cost_usd REAL;
    ALTER TABLE telemetry_metrics ADD COLUMN cost_status TEXT;
  `
}
