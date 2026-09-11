/**
 * 本机记录分桶表：列名与区块标题分开，数字右对齐，行上来源标。
 */
import type { CliUsageBucket } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { formatTokens } from "@renderer/components/ai-chat/agent-limits/format-tokens"
import { formatBucketLabel, hasTokenBreakdown } from "../../lib/format"
import { isMixedBucket } from "../../lib/filter"
import { CliUsageSourceMarks } from "../source-marks"

export function CliUsageBucketTable(props: {
  keyLabel: string
  rows: CliUsageBucket[]
  filtered: boolean
}) {
  const t = useT()
  if (props.rows.length === 0) {
    return (
      <p className="px-3.5 py-6 text-center text-caption-1-medium text-text-tertiary">
        {t("pages.observability.cliUsageEmptyBuckets")}
      </p>
    )
  }
  const mixedVisible = props.filtered && props.rows.some((row) => isMixedBucket(row))
  return (
    <div className="min-w-0">
      {mixedVisible ? (
        <p className="border-b border-separator-border/40 px-3.5 py-2 text-caption-2-medium text-text-tertiary">
          {t("pages.observability.cliUsageMixedFilterHint")}
        </p>
      ) : null}
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left">
          <thead className="text-caption-2-medium text-text-tertiary">
            <tr>
              <th className="px-3.5 py-2 font-medium">{props.keyLabel}</th>
              <NumHead>{t("pages.observability.cliUsageInput")}</NumHead>
              <NumHead>{t("pages.observability.cliUsageOutput")}</NumHead>
              <NumHead>{t("pages.observability.cliUsageCache")}</NumHead>
              <NumHead>{t("pages.observability.cliUsageTotal")}</NumHead>
              <NumHead>{t("pages.observability.cliUsageSessions")}</NumHead>
              <th className="px-3.5 py-2 font-medium">{t("pages.observability.cliUsageSourceCol")}</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <BucketRow key={row.key} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NumHead({ children }: { children: string }) {
  return <th className="px-3.5 py-2 text-right font-medium">{children}</th>
}

function BucketRow({ row }: { row: CliUsageBucket }) {
  const t = useT()
  const split = row.breakdownSessions === row.sessions && hasTokenBreakdown(row)
  return (
    <tr className="border-t border-separator-border/40 hover:bg-background-secondary-hover/40">
      <td className="max-w-[14rem] truncate px-3.5 py-2 text-caption-1-medium text-text-primary">
        {formatBucketLabel(row.key, t)}
      </td>
      <NumCell muted={!split}>{split ? formatTokens(row.inputTokens) : "—"}</NumCell>
      <NumCell muted={!split}>{split ? formatTokens(row.outputTokens) : "—"}</NumCell>
      <NumCell muted={!split}>{split ? formatTokens(row.cacheTokens) : "—"}</NumCell>
      <NumCell emphasize>{formatTokens(row.totalTokens)}</NumCell>
      <NumCell>{String(row.sessions)}</NumCell>
      <td className="px-3.5 py-2">
        <CliUsageSourceMarks ids={row.sourceIds} />
      </td>
    </tr>
  )
}

function NumCell(props: { children: string; muted?: boolean; emphasize?: boolean }) {
  return (
    <td
      className={cx(
        "px-3.5 py-2 text-right font-mono text-caption-1-medium tabular-nums",
        props.emphasize ? "text-text-primary" : "text-text-secondary",
        props.muted && "text-text-tertiary"
      )}
    >
      {props.children}
    </td>
  )
}
