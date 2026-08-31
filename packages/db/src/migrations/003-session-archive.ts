/**
 * 会话归档：archived_at 为空表示仍在侧栏；有值则只出现在设置「已归档的聊天」。
 */
import type { Migration } from "./types.ts"

export const sessionArchiveMigration: Migration = {
  version: 3,
  name: "session-archive",
  sql: `
    ALTER TABLE sessions ADD COLUMN archived_at INTEGER;
  `
}
