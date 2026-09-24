/**
 * 分叉来源与会话心跳。forked_from 只记来源，不复制 ACP 绑定。
 */
import type { Migration } from "./types.ts"

export const sessionForkHeartbeatMigration: Migration = {
  version: 12,
  name: "session-fork-heartbeat",
  sql: `
    ALTER TABLE sessions ADD COLUMN forked_from TEXT;
    CREATE TABLE session_heartbeats (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      cron_expr TEXT NOT NULL,
      time_zone TEXT NOT NULL,
      prompt TEXT NOT NULL,
      max_runs INTEGER,
      run_count INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `
}
