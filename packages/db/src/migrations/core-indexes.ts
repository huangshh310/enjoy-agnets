/**
 * 核心业务表二级索引：消灭 sessions, messages, message_parts, runs 的全表扫描。
 */
import type { Migration } from "./types.ts"

export const coreIndexesMigration: Migration = {
  version: 10,
  name: "core-indexes",
  sql: `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions (workspace_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages (session_id);
    CREATE INDEX IF NOT EXISTS idx_message_parts_message ON message_parts (message_id);
    CREATE INDEX IF NOT EXISTS idx_runs_session ON runs (session_id);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs (status);
  `
}
