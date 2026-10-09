import type { AutomationErrorCode } from "@enjoy-agents/ipc-contract"
import {
  CATCH_UP_APPROVAL_TIMEOUT,
  CATCH_UP_INTERRUPTED_BY_RESTART
} from "@enjoy-agents/ipc-contract/automations-missed"

/** skipped 保持原计数；只有 failed 累加；ok 清零。 */
export function nextConsecutiveFails(
  current: number | undefined,
  status: "ok" | "failed" | "skipped"
): number {
  if (status === "failed") return (current ?? 0) + 1
  if (status === "skipped") return current ?? 0
  return 0
}

export function skippedRunPatch(current?: { consecutiveFails?: number }): {
  lastRunStatus: "skipped"
  lastRunCatchUp: false
  lastError: undefined
  lastRunErrorCode: undefined
  consecutiveFails: number
} {
  return {
    lastRunStatus: "skipped",
    lastRunCatchUp: false,
    lastError: undefined,
    lastRunErrorCode: undefined,
    consecutiveFails: nextConsecutiveFails(current?.consecutiveFails, "skipped")
  }
}

/** 列表 lastRunErrorCode；超时与重启打断不是普通红错。 */
export function lastRunErrorCodeOf(
  status: "ok" | "failed",
  summary: string
): AutomationErrorCode | undefined {
  if (status !== "failed") return undefined
  if (summary === CATCH_UP_APPROVAL_TIMEOUT) return CATCH_UP_APPROVAL_TIMEOUT
  if (summary === CATCH_UP_INTERRUPTED_BY_RESTART) return CATCH_UP_INTERRUPTED_BY_RESTART
  return undefined
}
