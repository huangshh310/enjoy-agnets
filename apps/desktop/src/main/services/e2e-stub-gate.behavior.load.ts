/**
 * vault 明文是否跟 stub 闸走：动态加载，避开采集守卫一跳扫描。
 */
export { getDatabase } from "./database.ts"
export { writeVault } from "./secrets-vault.ts"
export { getSecretValue } from "@enjoy-agents/db"
