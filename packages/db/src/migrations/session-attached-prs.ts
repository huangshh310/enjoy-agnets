/**
 * P2 切片①：会话挂 PR 旁表（主挂 + 列表撑「+N」）。
 * 禁 prefs / 禁仅内存 / 禁 JSON 列糊弄。
 */
import type { Migration } from "./types.ts"

export const sessionAttachedPrsMigration: Migration = {
  version: 21,
  name: "session-attached-prs",
  sql: `
    CREATE TABLE IF NOT EXISTS session_attached_prs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(session_id, number)
    );
    CREATE INDEX IF NOT EXISTS idx_session_attached_prs_session
      ON session_attached_prs(session_id);
  `
}
