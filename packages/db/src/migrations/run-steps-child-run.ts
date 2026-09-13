/**
 * Run 步骤关联子 Run：供 Workflow DAG 节点穿透至真子会话 Run。
 */
import type { Migration } from "./types.ts"

export const runStepsChildRunMigration: Migration = {
  version: 7,
  name: "run-steps-child-run",
  sql: `
    ALTER TABLE run_steps ADD COLUMN child_run_id TEXT;
  `
}
