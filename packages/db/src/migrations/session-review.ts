/**
 * 待验收行：本轮改动文件与完成时间，给 Inbox 读。
 */
import { addColumnIfMissing } from "./column-guard.ts"
import type { Migration } from "./types.ts"

export const sessionReviewMigration: Migration = {
  version: 17,
  name: "session-review",
  apply(sqlite) {
    addColumnIfMissing(sqlite, "sessions", "review_changed_files", "TEXT")
    addColumnIfMissing(sqlite, "sessions", "review_completed_at", "TEXT")
  }
}
