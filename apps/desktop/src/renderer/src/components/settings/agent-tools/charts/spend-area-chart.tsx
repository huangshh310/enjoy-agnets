/**
 * 30 天堆叠面积：梯度填充 + 自然曲线，对标 EvilCharts Area。
 */
import { useId, useMemo } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { formatTokens } from "../format-spend"
import { SpendChartTooltip } from "./spend-chart-tooltip"
import { spendSliceFill } from "./spend-chart-colors"

export function SpendAreaChart({
  tools,
  metric,
  emptyMessage
}: {
  tools: AgentToolPublic[]
  metric: "tokens" | "cost"
  emptyMessage: string
}) {
  const uid = useId().replace(/:/g, "")
  const { rows, series } = useMemo(() => mergeTrend(tools, metric), [tools, metric])

  if (rows.length === 0 || series.length === 0) {
    return <p className="flex h-52 items-center justify-center text-caption-2-medium text-text-tertiary">{emptyMessage}</p>
  }

  return (
    <div className="h-52 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((item, index) => (
              <linearGradient key={item.id} id={`${uid}-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={spendSliceFill(item.id, index)} stopOpacity={0.38} />
                <stop offset="100%" stopColor={spendSliceFill(item.id, index)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-separator-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }}
            tickFormatter={(value: string) => String(value).slice(5)}
          />
          <Tooltip content={<SpendChartTooltip formatValue={metric === "cost" ? formatCost : formatTokens} />} />
          {series.map((item, index) => (
            <Area
              key={item.id}
              type="monotone"
              dataKey={item.id}
              name={item.label}
              stackId="spend"
              stroke={spendSliceFill(item.id, index)}
              strokeWidth={1.6}
              fill={`url(#${uid}-${item.id})`}
              fillOpacity={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatCost(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

function mergeTrend(tools: AgentToolPublic[], metric: "tokens" | "cost") {
  const series = tools
    .map((tool) => ({ id: tool.id, label: tool.label, points: tool.quotaInfo?.spend?.trend30Days ?? [] }))
    .filter((item) => item.points.some((point) => (metric === "cost" ? (point.costUsd ?? 0) : point.tokens) > 0))
  const dayMap = new Map<string, Record<string, string | number>>()
  for (const item of series) {
    for (const point of item.points) {
      const row = dayMap.get(point.day) ?? { day: point.day }
      row[item.id] = metric === "cost" ? (point.costUsd ?? 0) : point.tokens
      dayMap.set(point.day, row)
    }
  }
  const rows = Array.from(dayMap.values()).sort((a, b) => String(a.day).localeCompare(String(b.day)))
  return { rows, series: series.map(({ id, label }) => ({ id, label })) }
}
