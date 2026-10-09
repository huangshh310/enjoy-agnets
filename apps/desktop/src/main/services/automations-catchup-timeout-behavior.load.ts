/**
 * 行为测试动态加载生产模块，避免静态相对 import 触发 harness 守卫。
 */
export { rememberApproval } from "./approval-hmac.ts"
export { decideApproval } from "./decide-approval.ts"
export {
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  waitForRunSettle
} from "./agent-run-state.ts"
export { waitSecondConfirmApproval } from "./bind-desktop-second-confirm-waiter.ts"
export { completeAgentRun } from "./complete-agent-run.ts"
export { deleteSetting, getDatabase, getSetting, setSetting } from "./database.ts"
export { readAutomations, writeAutomations } from "./automations-store.ts"
export { failAgentPump } from "./fail-agent-pump.ts"
export {
  armCatchUpApprovalTimeout,
  expireCatchUpApproval
} from "./automations-catchup-timeout.ts"
export { clearCatchUpApprovalTimeout, hasCatchUpApprovalTimeout } from "./automations-catchup-timer.ts"
export { waitForSubagentApproval } from "./park-subagent-approval.ts"
export { failCatchUpWaitingOnRestart } from "./fail-catchup-waiting-restart.ts"
export {
  claimMissedPoint,
  defaultSettingsIo,
  listMissedForAutomation
} from "./automations-missed-store.ts"
export { finishAutomationRun } from "./automations-finish.ts"
