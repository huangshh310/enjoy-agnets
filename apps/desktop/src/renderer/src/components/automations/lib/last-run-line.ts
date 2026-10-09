/**
 * 列表次行：已跳过 / 错过 N 次 / 中性超时。名称旁不挂重复小标。
 */
import type { Automation, AutomationMissedRecord, AutomationSkipReason } from "@enjoy-agents/ipc-contract"
import { formatLastRunWhen } from "./last-run-label"
import { errorCodeCopy, errorCodeTip, isNeutralErrorCode, skipReasonCopy, skipReasonTip } from "./missed-copy"

type Translate = (key: string, vars?: Record<string, string | number>) => string

export type LastRunLine = {
  kind: "running" | "never" | "last" | "skipped" | "missed_many" | "neutral"
  text: string
  tip?: string
  testId: string
}

export function consecutiveSkipStreak(records: AutomationMissedRecord[]): {
  count: number
  reason?: AutomationSkipReason
  scheduledAt?: number
} {
  const ordered = [...records].sort((left, right) => right.scheduledAt - left.scheduledAt)
  const first = ordered[0]
  if (first?.kind !== "skipped") return { count: 0 }
  let count = 0
  for (const row of ordered) {
    if (row.kind !== "skipped" || row.reason !== first.reason) break
    count += 1
  }
  return { count, reason: first.reason, scheduledAt: first.scheduledAt }
}

export function lastRunLine(input: {
  automation: Automation
  records: AutomationMissedRecord[]
  now: number
  locale: string
  t: Translate
}): LastRunLine {
  const { automation, records, now, locale, t } = input
  const neutral = errorCodeCopy(automation.lastRunErrorCode, t)
  if (neutral && isNeutralErrorCode(automation.lastRunErrorCode)) {
    const when = formatLastRunWhen(automation.lastRunAt ?? now, now, locale)
    return {
      kind: "neutral",
      text: `${neutral} · ${when}`,
      tip: errorCodeTip(automation.lastRunErrorCode, t),
      testId: "automation-row-neutral"
    }
  }
  if (automation.lastRunStatus === "running") {
    return { kind: "running", text: t("studio.automations.roundOpened"), testId: "automation-row-running" }
  }
  if (automation.lastRunStatus === "skipped") {
    return skippedLine(automation, records, now, locale, t)
  }
  if (automation.lastRunAt) {
    return {
      kind: "last",
      text: t("studio.automations.lastRun", { when: formatLastRunWhen(automation.lastRunAt, now, locale) }),
      testId: "automation-row-last"
    }
  }
  return { kind: "never", text: t("studio.automations.neverRun"), testId: "automation-row-never" }
}

function skippedLine(
  automation: Automation,
  records: AutomationMissedRecord[],
  now: number,
  locale: string,
  t: Translate
): LastRunLine {
  const streak = consecutiveSkipStreak(records)
  const reason = streak.reason ?? automation.lastSkipReason
  const at = streak.scheduledAt ?? automation.lastRunAt ?? now
  const when = formatLastRunWhen(at, now, locale)
  const tip = skipReasonTip(reason, t)
  if (streak.count >= 2) {
    return {
      kind: "missed_many",
      text: t("studio.automations.missedMany", { n: streak.count, reason: skipReasonCopy(reason, t), when }),
      tip,
      testId: "automation-row-missed-many"
    }
  }
  return {
    kind: "skipped",
    text: t("studio.automations.skippedLine", { reason: skipReasonCopy(reason, t), when }),
    tip,
    testId: "automation-row-skipped"
  }
}

/** 抽屉折叠条：预览 B 组摘要，不是固定「展开错过记录」。 */
export function missedGroupSummary(input: {
  records: AutomationMissedRecord[]
  now: number
  locale: string
  t: Translate
}): string {
  const { records, now, locale, t } = input
  const streak = consecutiveSkipStreak(records)
  const when = streak.scheduledAt != null ? formatLastRunWhen(streak.scheduledAt, now, locale) : ""
  if (streak.count >= 2) {
    return t("studio.automations.missedMany", {
      n: streak.count,
      reason: skipReasonCopy(streak.reason, t),
      when
    })
  }
  if (streak.count === 1) {
    return t("studio.automations.skippedLine", {
      reason: skipReasonCopy(streak.reason, t),
      when
    })
  }
  if (records.length === 0) return t("studio.automations.missedEmpty")
  return t("studio.automations.missedCount", { n: records.length })
}
