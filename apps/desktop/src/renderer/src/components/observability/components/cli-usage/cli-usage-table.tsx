/**
 * 本机记录分桶表：列名与区块标题分开，数字右对齐。
 */
import type { CliUsageBucket } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { formatTokens } from "@renderer/components/ai-chat/agent-limits/format-tokens"
import { hasTokenBreakdown } from "./cli-usage-format"

export function CliUsageBucketTable(props: {
  title: string
  keyLabel: string
  rows: CliUsageBucket[]
}) {
  const t = useT()
  if (props.rows.length === 0) return null
  return (
    <section className="overflow-hidden rounded-xl border border-separator-border/70 bg-background-primary-default shadow-2xs">
      <h3 className="border-b border-separator-border/60 bg-background-secondary-default/60 px-3.5 py-2 text-caption-1-medium text-text-secondary">
        {props.title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-caption-2-medium text-text-tertiary">
            <tr>
              <th className="px-3.5 py-2 font-medium">{props.keyLabel}</th>
              <NumHead>{t("pages.observability.cliUsageInput")}</NumHead>
              <NumHead>{t("pages.observability.cliUsageOutput")}</NumHead>
              <NumHead>{t("pages.observability.cliUsageCache")}</NumHead>
              <NumHead>{t("pages.observability.cliUsageTotal")}</NumHead>
              <NumHead>{t("pages.observability.cliUsageSessions")}</NumHead>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <BucketRow key={row.key} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function NumHead({ children }: { children: string }) {
  return <th className="px-3.5 py-2 text-right font-medium">{children}</th>
}

function BucketRow({ row }: { row: CliUsageBucket }) {
  const split = hasTokenBreakdown(row)
  return (
    <tr className="border-t border-separator-border/40 hover:bg-background-secondary-hover/40">
      <td className="max-w-[14rem] truncate px-3.5 py-2 text-caption-1-medium text-text-primary">
        {row.key}
      </td>
      <NumCell muted={!split}>{split ? formatTokens(row.inputTokens) : "—"}</NumCell>
      <NumCell muted={!split}>{split ? formatTokens(row.outputTokens) : "—"}</NumCell>
      <NumCell muted={!split}>{split ? formatTokens(row.cacheTokens) : "—"}</NumCell>
      <NumCell emphasize>{formatTokens(row.totalTokens)}</NumCell>
      <NumCell>{String(row.sessions)}</NumCell>
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
