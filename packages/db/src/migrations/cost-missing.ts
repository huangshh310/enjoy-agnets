/**
 * 指标补 cost_missing：把 unknown 的原因透传到 renderer，缺项保持 NULL。
 */
import type { Migration } from "./types.ts"

export const costMissingMigration: Migration = {
  version: 15,
  name: "cost-missing",
  sql: `
    ALTER TABLE telemetry_metrics ADD COLUMN cost_missing TEXT;
  `
}
