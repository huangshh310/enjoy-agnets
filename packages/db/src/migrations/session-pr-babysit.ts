/**
 * P2 切片②：会话「盯着」本机已挂 PR 旁表（watching flag + poll cursors）。
 * 禁 prefs / 禁仅内存 / 禁 JSON 列糊弄；禁用户面 babysit 主标签。
 */
import type { Migration } from "./types.ts"

export const sessionPrBabysitMigration: Migration = {
  version: 22,
  name: "session-pr-babysit",
  sql: `
    CREATE TABLE IF NOT EXISTS session_pr_babysit (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      started_at INTEGER NOT NULL,
      last_polled_at INTEGER,
      last_checks_state TEXT,
      last_comment_count INTEGER,
      last_mergeable TEXT,
      last_wake_kind TEXT,
      UNIQUE(session_id, number)
    );
    CREATE INDEX IF NOT EXISTS idx_session_pr_babysit_session
      ON session_pr_babysit(session_id);
  `
}
