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
    const latestAny = [...records].sort((left, right) => right.scheduledAt - left.scheduledAt)[0]
    const when = formatLastRunWhen(automation.lastRunAt, now, locale)
    const text =
      latestAny && isSuccessfulCatchUp(latestAny)
        ? missedGroupSummary({ records, now, locale, t })
        : lastRunStatusLine(automation.lastRunStatus, when, t)
    return { kind: "last", text, testId: "automation-row-last" }
  }
  return { kind: "never", text: t("studio.automations.neverRun"), testId: "automation-row-never" }
}

/** 抽屉常驻「上次：…」：有过运行才给文案，不要埋进折叠条。 */
export function drawerLastRunText(input: {
  automation: Automation
  records: AutomationMissedRecord[]
  now: number
  locale: string
  t: Translate
}): string | undefined {
  const line = lastRunLine(input)
  if (line.kind === "never") return undefined
  return line.text
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
  // 列表次行与抽屉折叠条必须走同一句。N 只数 skipped，禁止把成功补跑算进错过。
  const skippedCount = records.filter((row) => row.kind === "skipped").length
  if (skippedCount >= 2) {
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

/** 抽屉折叠条：N 只数 skipped；最新一条成功补跑时不写「错过」。 */
export function missedGroupSummary(input: {
  records: AutomationMissedRecord[]
  now: number
  locale: string
  t: Translate
}): string {
  const { records, now, locale, t } = input
  if (records.length === 0) return t("studio.automations.missedEmpty")
  const ordered = [...records].sort((left, right) => right.scheduledAt - left.scheduledAt)
  const latestAny = ordered[0]
  if (latestAny && isSuccessfulCatchUp(latestAny)) {
    return t("studio.automations.lastRunOk", {
      when: formatLastRunWhen(latestAny.recordedAt ?? latestAny.scheduledAt, now, locale)
    })
  }
  const skipped = ordered.filter((row) => row.kind === "skipped")
  const latest = skipped[0]
  if (!latest) return t("studio.automations.missedRecentCount", { n: records.length })
  const when = formatLastRunWhen(latest.scheduledAt, now, locale)
  const reason = skipReasonCopy(latest.reason, t)
  if (skipped.length === 1) {
    return t("studio.automations.skippedLine", { reason, when })
  }
  const reasons = new Set(skipped.map((row) => row.reason))
  return t(reasons.size === 1 ? "studio.automations.missedGroupSame" : "studio.automations.missedGroupMixed", {
    n: skipped.length,
    reason,
    when
  })
}

function lastRunStatusLine(
  status: Automation["lastRunStatus"],
  when: string,
  t: Translate
): string {
  if (status === "ok") return t("studio.automations.lastRunOk", { when })
  if (status === "failed") return t("studio.automations.lastRunFailed", { when })
  return t("studio.automations.lastRun", { when })
}

function isSuccessfulCatchUp(row: AutomationMissedRecord): boolean {
  return (row.kind === "catch_up" || row.isCatchUp === true) && row.status === "ok"
}
