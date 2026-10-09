import {
  CATCH_UP_APPROVAL_TIMEOUT,
  CATCH_UP_INTERRUPTED_BY_RESTART
} from "@enjoy-agents/ipc-contract/automations-missed"

/** skipped 不当失败；只有 failed 累加。 */
export function nextConsecutiveFails(
  current: number | undefined,
  status: "ok" | "failed" | "skipped"
): number {
  return status === "failed" ? (current ?? 0) + 1 : 0
}

/** 列表 lastRunErrorCode；超时与重启打断不是普通红错。 */
export function lastRunErrorCodeOf(
  status: "ok" | "failed",
  summary: string
): string | undefined {
  if (status !== "failed") return undefined
  if (summary === CATCH_UP_APPROVAL_TIMEOUT) return CATCH_UP_APPROVAL_TIMEOUT
  if (summary === CATCH_UP_INTERRUPTED_BY_RESTART) return CATCH_UP_INTERRUPTED_BY_RESTART
  return undefined
}
