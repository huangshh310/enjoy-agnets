/**
 * Enjoy 会话绑定 ACP sessionId，供 resume / close / delete。
 */
import type { Migration } from "./types.ts"

export const acpSessionBindMigration: Migration = {
  version: 11,
  name: "acp-session-bind",
  sql: `
    ALTER TABLE sessions ADD COLUMN acp_runtime_id TEXT;
    ALTER TABLE sessions ADD COLUMN acp_session_id TEXT;
  `
}
