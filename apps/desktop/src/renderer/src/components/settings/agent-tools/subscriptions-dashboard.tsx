/**
 * 订阅与额度：一份卡片网格。有窗口的画额度条，只有本机消耗的画 30 天柱。
 * 不要底表「本机消耗」，不要 Hub 里三块空脉冲。
 */
import { useMemo, useState } from "react"
import { RiPieChartLine, RiRefreshLine } from "@remixicon/react"
import { useQueryClient } from "@tanstack/react-query"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { shouldInspect } from "@renderer/hooks/merge-agent-tool-inspect"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { SettingsHub } from "../settings-hub"
import { AgentSubscriptionCard } from "./agent-subscription-card"
import { SpendAreaChart } from "./charts/spend-area-chart"
import { type SpendSlice as AgentSpendSlice } from "./charts/spend-chart-colors"
import { SpendPieChart } from "./charts/spend-pie-chart"
import { UsageChartGallery } from "./charts/usage-chart-gallery"
import { formatDollars, formatTokens } from "./format-spend"

type SpendPeriod = "today" | "yesterday" | "last30Days"
type SpendMetric = "cost" | "tokens"

export function SubscriptionsDashboard({
  onConfigureTool
}: {
  onConfigureTool?: (toolId: string) => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const snapshot = useSettingsSnapshot()
  const tools = snapshot.data?.agentTools ?? []
  const inspecting = snapshot.isInspectingAccounts
  const [period, setPeriod] = useState<SpendPeriod>("last30Days")
  const [metric, setMetric] = useState<SpendMetric>("tokens")
  const [showLeft, setShowLeft] = useState(true)
  const [showExactReset, setShowExactReset] = useState(false)

  const listed = useMemo(
    () =>
      tools.filter(isSubscriptionCard).sort((left, right) => {
        const leftWindows = left.quotaInfo?.windows?.length ?? 0
        const rightWindows = right.quotaInfo?.windows?.length ?? 0
        if (Boolean(leftWindows) !== Boolean(rightWindows)) return rightWindows ? 1 : -1
        return (right.quotaInfo?.spend?.last30Days?.tokens ?? 0) - (left.quotaInfo?.spend?.last30Days?.tokens ?? 0)
      }),
    [tools]
  )
  const spend = useMemo(() => aggregateSpend(tools, period, metric), [tools, period, metric])
  const hasTokenSpend = spend.totalTokens > 0
  const warnCount = useMemo(
    () =>
      listed.reduce(
        (count, tool) =>
          count +
          (tool.quotaInfo?.windows ?? []).filter(
            (item) =>
              item.pacing?.status === "warning" ||
              item.pacing?.status === "danger" ||
              item.pacing?.status === "exhausted"
          ).length,
        0
      ),
    [listed]
  )

  const chartEmpty =
    metric === "cost" ? t("settings.subscriptions.costEmpty") : t("settings.subscriptions.emptySpend")
  const showChartDock = inspecting || hasTokenSpend || spend.slices.length > 0
  const showBlank = !inspecting && listed.length === 0 && !hasTokenSpend
  const quotaCount = listed.filter((tool) => (tool.quotaInfo?.windows?.length ?? 0) > 0).length

  async function refreshInspect() {
    await Promise.allSettled(
      tools.filter(shouldInspect).map((tool) => getIde().agentTools.inspect({ id: tool.id, refresh: true }))
    )
    await queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsHub
        icon={RiPieChartLine}
        title={t("settings.agentTools.tabSubscriptions")}
        description={t("settings.subscriptions.hubDesc")}
        action={
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
            onClick={() => void refreshInspect()}
            title={t("settings.subscriptions.refresh")}
          >
            <RiRefreshLine className={`size-4 ${inspecting ? "animate-spin" : ""}`} />
          </button>
        }
      >
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-caption-2-medium text-text-tertiary">
          <span>
            {t("settings.subscriptions.pulseQuota")}{" "}
            <span className="tabular-nums text-text-primary">{quotaCount}</span>
          </span>
          <span>
            {t("settings.subscriptions.pulseWarn")}{" "}
            <span className={warnCount > 0 ? "tabular-nums text-status-yellow-text" : "tabular-nums text-text-primary"}>
              {warnCount}
            </span>
          </span>
          <span>
            {t("settings.subscriptions.pulseSpend")}{" "}
            <span className="tabular-nums text-text-primary">{formatTokens(spend.totalTokens)}</span>
          </span>
        </p>

        {showChartDock ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Segmented
                value={metric}
                onChange={setMetric}
                items={[
                  ["tokens", t("settings.subscriptions.tokens")],
                  ["cost", t("settings.subscriptions.cost")]
                ]}
              />
              <Segmented
                value={period}
                onChange={setPeriod}
                items={[
                  ["today", t("settings.subscriptions.today")],
                  ["yesterday", t("settings.subscriptions.yesterday")],
                  ["last30Days", t("settings.subscriptions.last30")]
                ]}
              />
            </div>
            {inspecting && !hasTokenSpend && spend.slices.length === 0 ? (
              <p className="py-10 text-center text-caption-2-medium text-text-tertiary">
                {t("settings.subscriptions.loading")}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-5">
                  <SpendPieChart
                    slices={spend.slices}
                    centerPrimary={
                      metric === "cost" ? formatDollars(spend.totalCost) : formatTokens(spend.totalTokens)
                    }
                    centerUnit={metric === "cost" ? t("settings.subscriptions.dollars") : "tokens"}
                    emptyMessage={chartEmpty}
                    formatValue={metric === "cost" ? formatDollars : formatTokens}
                  />
                </div>
                <div className="min-w-0 lg:col-span-7">
                  <p className="mb-1 text-caption-2-medium text-text-tertiary">{t("settings.subscriptions.trendMix")}</p>
                  <SpendAreaChart tools={tools} metric={metric} emptyMessage={chartEmpty} />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </SettingsHub>

      {showBlank ? (
        <p className="py-10 text-center text-caption-1-medium text-text-tertiary">{t("settings.subscriptions.empty")}</p>
      ) : null}

      {listed.length > 0 || hasTokenSpend ? (
        <UsageChartGallery tools={tools} metric={metric} />
      ) : null}

      {listed.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {listed.map((tool) => (
            <AgentSubscriptionCard
              key={tool.id}
              tool={tool}
              showLeft={showLeft}
              onToggleLeft={() => setShowLeft((value) => !value)}
              showExactReset={showExactReset}
              onToggleExact={() => setShowExactReset((value) => !value)}
              onConfigure={onConfigureTool}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function isSubscriptionCard(tool: AgentToolPublic): boolean {
  const quota = tool.quotaInfo
  if ((quota?.windows?.length ?? 0) > 0 || quota?.hasQuota) return true
  return Boolean(quota?.spend?.last30Days?.tokens || quota?.spend?.today?.tokens || quota?.spend?.yesterday?.tokens)
}

function Segmented<T extends string>({
  value,
  onChange,
  items
}: {
  value: T
  onChange: (value: T) => void
  items: ReadonlyArray<readonly [T, string]>
}) {
  return (
    <div className="flex rounded-lg bg-background-secondary-default p-0.5 text-caption-2-medium">
      {items.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={`rounded-md px-2.5 py-1 ${value === key ? "bg-background-primary-default text-text-primary shadow-2xs" : "text-text-tertiary"}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function aggregateSpend(tools: AgentToolPublic[], period: SpendPeriod, metric: SpendMetric) {
  let totalTokens = 0
  let totalCost = 0
  const slices: AgentSpendSlice[] = []
  for (const tool of tools) {
    const bucket = tool.quotaInfo?.spend?.[period]
    const tokens = bucket?.tokens ?? 0
    const cost = bucket?.costUsd ?? 0
    totalTokens += tokens
    totalCost += cost
    const amount = metric === "cost" ? cost : tokens
    if (amount <= 0) continue
    slices.push({
      id: tool.id,
      label: tool.label,
      amount,
      displayAmount: metric === "cost" ? formatDollars(cost) : formatTokens(tokens)
    })
  }
  slices.sort((a, b) => b.amount - a.amount)
  return { totalTokens, totalCost, slices }
}
