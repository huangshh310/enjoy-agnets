/**
 * 会话工作流与目标：flagged（旗标置顶）、workflow_status（工作流四态）、goal（会话目标）、recap（隐藏记忆）。
 */
import type { Migration } from "./types.ts"

export const sessionWorkflowMigration: Migration = {
  version: 6,
  name: "session-workflow",
  sql: `
    ALTER TABLE sessions ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE sessions ADD COLUMN workflow_status TEXT;
    ALTER TABLE sessions ADD COLUMN goal TEXT;
    ALTER TABLE sessions ADD COLUMN recap TEXT;
  `
}
