/**
 * 抽屉轻量错过/补跑列表。折叠条是组摘要，不是固定「展开错过记录」。
 */
import { useState } from "react"
import type { AutomationMissedRecord } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { missedGroupSummary } from "../lib/last-run-line"
import { formatLastRunWhen } from "../lib/last-run-label"
import { catchUpWhenCopy, errorCodeCopy, isNeutralErrorCode, missedExpandLabel, skipReasonCopy } from "../lib/missed-copy"

export function MissedRecordsList({
  records,
  locale,
  now
}: {
  records: AutomationMissedRecord[]
  locale: string
  now: number
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ordered = [...records].sort((left, right) => right.scheduledAt - left.scheduledAt)
  const summary = missedGroupSummary({ records, now, locale, t })
  return (
    <details
      className="rounded-lg border border-border-button-default bg-background-secondary-default open:bg-background-primary-default"
      data-testid="automation-missed-expand"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-2.5 py-2 text-caption-1-medium text-text-primary [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span data-testid="automation-missed-summary">{summary}</span>
          <span className="text-caption-2-regular text-text-tertiary" data-testid="automation-missed-toggle">
            {missedExpandLabel(open, t)}
          </span>
        </span>
      </summary>
      {ordered.length === 0 ? (
        <p className="border-t border-separator-border px-2.5 py-2 text-caption-2-regular text-text-tertiary">
          {t("studio.automations.missedEmpty")}
        </p>
      ) : (
        <ul className="space-y-1 border-t border-separator-border px-2.5 py-2">
          {ordered.map((row) => (
            <MissedRecordRow key={`${row.kind}:${row.scheduledAt}`} row={row} locale={locale} now={now} />
          ))}
        </ul>
      )}
    </details>
  )
}

function MissedRecordRow({
  row,
  locale,
  now
}: {
  row: AutomationMissedRecord
  locale: string
  now: number
}) {
  const t = useT()
  const scheduled = formatLastRunWhen(row.scheduledAt, now, locale)
  const actual = formatLastRunWhen(row.recordedAt, now, locale)
  const timeout = errorCodeCopy(row.code, t)
  const catchUp = row.kind === "catch_up" || row.isCatchUp === true
  const when = catchUp
    ? catchUpWhenCopy({
        code: row.code,
        scheduled,
        actual,
        hasCancelTime: row.recordedAt !== row.scheduledAt,
        t
      })
    : scheduled
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-2 text-caption-2-regular text-text-tertiary"
      data-testid={catchUp ? "automation-missed-catch-up" : "automation-missed-record"}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        {catchUp ? (
          <span className="rounded-full bg-background-secondary-default px-1.5 py-px text-caption-2-regular text-text-tertiary ring-1 ring-border-button-default">
            {t("studio.automations.catchUpMarker")}
          </span>
        ) : null}
        <span>{when}</span>
      </span>
      <RecordStatus row={row} timeout={timeout} />
    </li>
  )
}

function RecordStatus({
  row,
  timeout
}: {
  row: AutomationMissedRecord
  timeout: string | null
}) {
  const t = useT()
  if (timeout && isNeutralErrorCode(row.code)) {
    return (
      <span className="text-text-tertiary" data-testid="automation-record-neutral">
        {timeout}
      </span>
    )
  }
  if (row.kind === "skipped" || row.status === "skipped") {
    return <span>{t("studio.automations.missedSkipped", { reason: skipReasonCopy(row.reason, t) })}</span>
  }
  const status = row.status
  const label =
    status === "ok"
      ? t("studio.automations.recordOk")
      : status === "running"
        ? t("studio.automations.recordRunning")
        : status === "failed"
          ? t("studio.automations.recordFailed")
          : t("studio.automations.recordSkipped")
  return (
    <span
      className={cx(
        "rounded-full px-1.5 py-px text-caption-2-regular ring-1",
        status === "ok"
          ? "bg-state-success-base/40 text-state-success-text ring-state-success-text/20"
          : status === "failed"
            ? "bg-background-secondary-default text-text-error-primary ring-border-error-default/25"
            : "bg-background-secondary-default text-text-tertiary ring-border-button-default"
      )}
    >
      {label}
    </span>
  )
}
