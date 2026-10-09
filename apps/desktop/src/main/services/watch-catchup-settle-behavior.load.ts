/**
 * 行为测试动态加载生产模块，避免静态相对 import 触发 harness 守卫。
 */
export { settleRun, waitForRunSettle } from "./agent-run-state.ts"
export { deleteSetting, getSetting, setSetting } from "./database.ts"
export { failInterruptedCatchUps } from "./automations-catchup-orphans.ts"
export {
  claimMissedPoint,
  defaultSettingsIo,
  listMissedForAutomation
} from "./automations-missed-store.ts"
export { readAutomations, writeAutomations } from "./automations-store.ts"
export { stampUnrestoredCatchUp } from "./restore-catchup.ts"
export { watchCatchUpSettle } from "./watch-catchup-settle.ts"
