/**
 * 本机记录时序走势面积图：支持输入/输出/缓存 Token 构成堆叠与总量趋势。
 * 对标 EvilCharts Area 与订阅页 SpendAreaChart。
 */
import { useId } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { SpendChartTooltip } from "@renderer/components/settings/agent-tools/charts/spend-chart-tooltip"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"
import { useT } from "@renderer/i18n"
import type { CliUsageDayPoint } from "./cli-usage-chart-data"

export function CliUsageAreaChart({
  days,
  metric,
  emptyMessage
}: {
  days: CliUsageDayPoint[]
  metric: "breakdown" | "total"
  emptyMessage: string
}) {
  const t = useT()
  const uid = useId().replace(/:/g, "")

  if (days.length === 0) {
    return (
      <p className="flex h-52 items-center justify-center text-caption-2-medium text-text-tertiary">
        {emptyMessage}
      </p>
    )
  }

  const isBreakdown = metric === "breakdown"

  return (
    <div className="h-[210px] w-full min-w-0">
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`${uid}-total`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${uid}-cache`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-6)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--color-chart-6)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${uid}-input`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${uid}-output`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-separator-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            minTickGap={20}
            tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }}
          />
          <Tooltip content={<SpendChartTooltip formatValue={formatTokens} />} />

          {isBreakdown ? (
            <>
              <Area
                type="monotone"
                dataKey="cacheTokens"
                name={t("pages.observability.cliUsageCache")}
                stackId="tokens"
                stroke="var(--color-chart-6)"
                strokeWidth={1.6}
                fill={`url(#${uid}-cache)`}
                fillOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="inputTokens"
                name={t("pages.observability.cliUsageInput")}
                stackId="tokens"
                stroke="var(--color-chart-3)"
                strokeWidth={1.6}
                fill={`url(#${uid}-input)`}
                fillOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="outputTokens"
                name={t("pages.observability.cliUsageOutput")}
                stackId="tokens"
                stroke="var(--color-accent-500)"
                strokeWidth={1.6}
                fill={`url(#${uid}-output)`}
                fillOpacity={1}
              />
            </>
          ) : (
            <Area
              type="monotone"
              dataKey="totalTokens"
              name={t("pages.observability.cliUsageTotal")}
              stroke="var(--color-accent-500)"
              strokeWidth={1.8}
              fill={`url(#${uid}-total)`}
              fillOpacity={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
