/**
 * 行为测试动态加载生产模块，避免静态相对 import 触发 harness 守卫。
 */
export {
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  settleRun,
  waitForRunSettle
} from "./agent-run-state.ts"
export { deleteSetting, getDatabase, getSetting, setSetting } from "./database.ts"
export { failInterruptedCatchUps } from "./automations-catchup-orphans.ts"
export { restoreWaitingRuns } from "./restore-waiting-runs.ts"
export {
  claimMissedPoint,
  defaultSettingsIo,
  listMissedForAutomation
} from "./automations-missed-store.ts"
export { readAutomations, writeAutomations } from "./automations-store.ts"
export { attachRestoredCatchUp, stampUnrestoredCatchUp } from "./restore-catchup.ts"
export { watchCatchUpSettle } from "./watch-catchup-settle.ts"
