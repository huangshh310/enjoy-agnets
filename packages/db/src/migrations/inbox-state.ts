/**
 * Inbox 档案：已读 / 隐藏状态与归档条目，跨重启耐久。
 */
import type { Migration } from "./types.ts"

export const inboxStateMigration: Migration = {
  version: 5,
  name: "inbox-state",
  sql: `
    CREATE TABLE IF NOT EXISTS inbox_state (
      id TEXT PRIMARY KEY,
      read_at INTEGER,
      hidden_at INTEGER,
      item_json TEXT,
      updated_at INTEGER NOT NULL
    );
  `
}
