/**
 * 工程向文案（HMAC / TTL / bundle id / 裸动作）只在开发者文案档出现。
 * 默认关：pnpm dev 与正式包都走人话。打开：localStorage enjoy-agents-dev-copy=1。
 */
export const DEV_COPY_STORAGE_KEY = "enjoy-agents-dev-copy"

export function isDevCopyEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(DEV_COPY_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}
