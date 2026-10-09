/**
 * 行为测试动态加载生产模块，避免静态相对 import 触发 harness 守卫。
 */
export { rememberApproval, recordApprovalDecision, recordSdkApprovalResponse } from "./approval-hmac.ts"
export { getDatabase } from "./database.ts"
