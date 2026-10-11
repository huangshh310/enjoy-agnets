/**
 * 显式截断行为测试：动态加载，避开采集守卫。
 */
export { insertRun } from "@enjoy-agents/db"
export { getDatabase } from "./database.ts"
export { holdAgentRun, deleteActiveRun } from "./agent-run-state.ts"
export {
  applyExplicitSessionTruncate,
  setTruncateThrowAfterFirstDeleteForTest,
  truncateSessionFrom
} from "./session-truncate.ts"
export {
  clearAllConversationSessionAllows,
  grantConversationToolAllow,
  snapshotConversationSessionAllow
} from "./conversation-session-allow.ts"
export { persistMessage, MESSAGE_ID_SESSION_MISMATCH } from "./persist-session.ts"
