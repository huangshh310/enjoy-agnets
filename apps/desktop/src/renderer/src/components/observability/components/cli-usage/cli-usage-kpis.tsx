/**
 * 本机记录 KPI：对齐大盘指标卡。有拆分画四卡，没有则合计加会话，不画假 0。
 */
import {
  RiDatabase2Line,
  RiDownload2Line,
  RiFileList3Line,
  RiPulseLine,
  RiUpload2Line
} from "@remixicon/react"
import type { CliUsageBucket } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { formatTokens } from "@renderer/components/ai-chat/agent-limits/format-tokens"
import { hasTokenBreakdown, sharePercent } from "./cli-usage-format"

export function CliUsageKpis({ totals }: { totals: CliUsageBucket }) {
  const split = hasTokenBreakdown(totals)
  return split ? <SplitKpiRow totals={totals} /> : <TotalKpiRow totals={totals} />
}

function TotalKpiRow({ totals }: { totals: CliUsageBucket }) {
  const t = useT()
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      <div className="sm:col-span-2">
        <KpiCard
          label={t("pages.observability.cliUsageTotal")}
          value={formatTokens(totals.totalTokens)}
          hint={t("pages.observability.cliUsageNoSplit")}
          icon={RiPulseLine}
          iconClass="text-accent-500"
        />
      </div>
      <KpiCard
        label={t("pages.observability.cliUsageSessions")}
        value={String(totals.sessions)}
        hint={t("pages.observability.cliUsageSessionCount", { n: totals.sessions })}
        icon={RiFileList3Line}
        iconClass="text-foreground-icon-secondary"
      />
    </div>
  )
}

function SplitKpiRow({ totals }: { totals: CliUsageBucket }) {
  const t = useT()
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <KpiCard
        label={t("pages.observability.cliUsageTotal")}
        value={formatTokens(totals.totalTokens)}
        hint={t("pages.observability.cliUsageSessionCount", { n: totals.sessions })}
        icon={RiPulseLine}
        iconClass="text-accent-500"
      />
      <SplitKpi
        label={t("pages.observability.cliUsageInput")}
        value={totals.inputTokens}
        total={totals.totalTokens}
        icon={RiDownload2Line}
      />
      <SplitKpi
        label={t("pages.observability.cliUsageOutput")}
        value={totals.outputTokens}
        total={totals.totalTokens}
        icon={RiUpload2Line}
      />
      <SplitKpi
        label={t("pages.observability.cliUsageCache")}
        value={totals.cacheTokens}
        total={totals.totalTokens}
        icon={RiDatabase2Line}
      />
    </div>
  )
}

function SplitKpi(props: {
  label: string
  value: number
  total: number
  icon: typeof RiDownload2Line
}) {
  const t = useT()
  const share = sharePercent(props.value, props.total)
  return (
    <KpiCard
      label={props.label}
      value={formatTokens(props.value)}
      hint={
        share === undefined
          ? t("pages.observability.cliUsageNoSplit")
          : t("pages.observability.cliUsageShare", { n: share })
      }
      icon={props.icon}
      iconClass="text-foreground-icon-secondary"
    />
  )
}

function KpiCard(props: {
  label: string
  value: string
  hint: string
  icon: typeof RiPulseLine
  iconClass: string
}) {
  const Icon = props.icon
  return (
    <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3 shadow-2xs">
      <div className="flex items-center justify-between text-text-tertiary">
        <span className="text-caption-2-medium">{props.label}</span>
        <Icon className={cx("size-3.5", props.iconClass)} />
      </div>
      <p className="mt-2 font-mono text-title-3-semibold tabular-nums text-text-primary">{props.value}</p>
      <p className="mt-1 font-mono text-caption-2-medium text-text-tertiary">{props.hint}</p>
    </div>
  )
}
