/**
 * 自动化一轮收口：列表 lastRunErrorCode + 错过记录 code。
 */
import { CATCH_UP_APPROVAL_TIMEOUT } from "@enjoy-agents/ipc-contract/automations-missed"
import { lastRunErrorCodeOf, nextConsecutiveFails } from "./automations-fails"
import { defaultSettingsIo, patchMissedPoint } from "./automations-missed-store"
import { patchStoredAutomation, readAutomations } from "./automations-store"

export function finishAutomationRun(
  id: string,
  status: "ok" | "failed",
  summary: string,
  opts: { scheduledAt?: number; isCatchUp?: boolean } = {}
): void {
  const current = readAutomations().find((row) => row.id === id)
  const fails = nextConsecutiveFails(current?.consecutiveFails, status)
  const limit = current?.stopOnFailCount ?? 3
  const code = lastRunErrorCodeOf(status, summary)
  patchStoredAutomation(id, {
    lastRunStatus: status,
    lastRunCatchUp: opts.isCatchUp === true,
    lastError: status === "failed" ? summary || "Automation failed." : undefined,
    lastRunErrorCode: code,
    consecutiveFails: fails,
    ...(status === "failed" && fails >= limit ? { enabled: false } : {})
  })
  if (opts.scheduledAt != null) {
    patchMissedPoint(defaultSettingsIo(), id, opts.scheduledAt, {
      status,
      isCatchUp: opts.isCatchUp === true,
      ...(summary === CATCH_UP_APPROVAL_TIMEOUT ? { code: CATCH_UP_APPROVAL_TIMEOUT } : {})
    })
  }
}
