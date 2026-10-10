/**
 * 首字前失败的 run 留下 discarded 标记，方便对照回滚掉的气泡。
 */
import { addColumnIfMissing } from "./column-guard.ts"
import type { Migration } from "./types.ts"

export const runDiscardedPreOutputMigration: Migration = {
  version: 18,
  name: "run-discarded-pre-output",
  apply(sqlite) {
    addColumnIfMissing(sqlite, "runs", "discarded_pre_output", "INTEGER NOT NULL DEFAULT 0")
  }
}
