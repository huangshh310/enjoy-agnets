/**
 * 来源四态：不碰盘，只根据 scan / 目录 / 会话数推导。
 */
import type { CliUsageSourceStatus } from "@enjoy-agents/ipc-contract"
import type { CliUsageScanMode } from "./catalog.ts"

export function sourceStatus(input: {
  scan: CliUsageScanMode
  directoryFound: boolean
  sessionCount: number
}): CliUsageSourceStatus {
  if (input.scan === "none") return "unsupported"
  if (!input.directoryFound) return "directory-missing"
  if (input.sessionCount > 0) return "has-usage"
  return "scanned-empty"
}
