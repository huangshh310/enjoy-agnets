/**
 * 列表次行：已跳过 / 错过 N 次 / 中性超时。名称旁不挂重复小标。
 */
import type { Automation, AutomationMissedRecord, AutomationSkipReason } from "@enjoy-agents/ipc-contract"
import { joinSegments } from "../../../lib/join-segments"
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
      text: joinSegments(neutral, when),
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
  const latest = [...records]
    .filter((row) => row.kind === "skipped")
    .sort((left, right) => right.scheduledAt - left.scheduledAt)[0]
  const reason = latest?.reason ?? automation.lastSkipReason
  const tip = skipReasonTip(reason, t)
  // 列表次行与抽屉折叠条必须走同一句，禁止再数 consecutiveSkipStreak。
  if (records.length >= 2) {
    return {
      kind: "missed_many",
      text: missedGroupSummary({ records, now, locale, t }),
      tip,
      testId: "automation-row-missed-many"
    }
  }
  const at = latest?.scheduledAt ?? automation.lastRunAt ?? now
  return {
    kind: "skipped",
    text: t("studio.automations.skippedLine", {
      reason: skipReasonCopy(reason, t),
      when: formatLastRunWhen(at, now, locale)
    }),
    tip,
    testId: "automation-row-skipped"
  }
}

/** 抽屉折叠条：同因不写「最近」；混因才标最近原因，条数按整组。 */
export function missedGroupSummary(input: {
  records: AutomationMissedRecord[]
  now: number
  locale: string
  t: Translate
}): string {
  const { records, now, locale, t } = input
  if (records.length === 0) return t("studio.automations.missedEmpty")
  const skipped = [...records]
    .filter((row) => row.kind === "skipped")
    .sort((left, right) => right.scheduledAt - left.scheduledAt)
  const latest = skipped[0]
  if (!latest) return t("studio.automations.missedCount", { n: records.length })
  const when = formatLastRunWhen(latest.scheduledAt, now, locale)
  const reason = skipReasonCopy(latest.reason, t)
  if (records.length === 1) {
    return t("studio.automations.skippedLine", { reason, when })
  }
  const reasons = new Set(skipped.map((row) => row.reason))
  const same = reasons.size === 1 && skipped.length === records.length
  return t(same ? "studio.automations.missedGroupSame" : "studio.automations.missedGroupMixed", {
    n: records.length,
    reason,
    when
  })
}
