/**
 * EvilCharts 时间序列图种：分位面积、组合、出货对比、增长、横向柱、日格。
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import { formatTokens } from "../format-spend"
import { SpendChartTooltip } from "./spend-chart-tooltip"
import type { UsageChartModel } from "./usage-chart-data"
import { UsageBlocksHeatmap } from "./usage-blocks-heatmap"
import { UsageChartCard } from "./usage-chart-card"

const tick = { fill: "var(--color-text-tertiary)", fontSize: 11 }

export type SeriesChartView = "percentiles" | "portfolio" | "growth" | "shipments" | "bars" | "composed" | "blocks"

export function UsageSeriesGallery({ model, view }: { model: UsageChartModel; view: SeriesChartView }) {
  const format = model.metric === "cost" ? (n: number) => `$${n.toFixed(0)}` : formatTokens
  if (view === "percentiles") {
    return (
      <UsageChartCard title="消耗分位" hint="latency-percentiles · 各助手当日消耗的 P50 / P90 / 峰值">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={model.percentile} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-separator-border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={tick} tickLine={false} axisLine={false} tickFormatter={shortDay} />
            <Tooltip content={<SpendChartTooltip formatValue={format} />} />
            <Area type="monotone" dataKey="max" name="峰值" stroke="var(--color-chart-3)" fill="var(--color-chart-3)" fillOpacity={0.12} />
            <Area type="monotone" dataKey="p90" name="P90" stroke="var(--color-chart-5)" fill="var(--color-chart-5)" fillOpacity={0.18} />
            <Area type="monotone" dataKey="p50" name="P50" stroke="var(--color-accent-500)" fill="var(--color-accent-500)" fillOpacity={0.28} />
          </AreaChart>
        </ResponsiveContainer>
      </UsageChartCard>
    )
  }
  if (view === "portfolio") {
    return (
      <UsageChartCard title="助手对比" hint="portfolio-comparison · 未堆叠面积">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={model.days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-separator-border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={tick} tickLine={false} axisLine={false} tickFormatter={shortDay} />
            <Tooltip content={<SpendChartTooltip formatValue={format} />} />
            {model.series.map((item) => (
              <Area
                key={item.id}
                type="monotone"
                dataKey={item.id}
                name={item.label}
                stroke={item.color}
                fill={item.color}
                fillOpacity={0.18}
                strokeWidth={1.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </UsageChartCard>
    )
  }
  if (view === "growth") {
    return (
      <UsageChartCard title="累计增长" hint="audience-growth · 30 天累计 Token">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={model.growth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-separator-border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={tick} tickLine={false} axisLine={false} tickFormatter={shortDay} />
            <Tooltip content={<SpendChartTooltip formatValue={format} />} />
            <Area type="monotone" dataKey="total" name="累计" stroke="var(--color-accent-500)" fill="var(--color-accent-500)" fillOpacity={0.22} />
          </AreaChart>
        </ResponsiveContainer>
      </UsageChartCard>
    )
  }
  if (view === "shipments") {
    return (
      <UsageChartCard title="本周 vs 上周" hint="shipments · 近 7 天对照">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={model.shipments} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-separator-border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={tick} tickLine={false} axisLine={false} />
            <Tooltip content={<SpendChartTooltip formatValue={format} />} />
            <Line type="monotone" dataKey="thisWeek" name="本周" stroke="var(--color-accent-500)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="lastWeek" name="上周" stroke="var(--color-chart-6)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </UsageChartCard>
    )
  }
  if (view === "bars") {
    return (
      <UsageChartCard title="助手排行" hint="Bar Chart · 近 30 天">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={model.ranking} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={88} tick={tick} tickLine={false} axisLine={false} />
            <Tooltip content={<SpendChartTooltip formatValue={format} />} />
            <Bar dataKey="amount" name="用量" radius={[0, 6, 6, 0]} fill="var(--color-accent-500)" barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </UsageChartCard>
    )
  }
  if (view === "composed") {
    return (
      <UsageChartCard title="日消耗 + 累计" hint="Composed Chart · 柱 + 线">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={model.composed} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-separator-border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={tick} tickLine={false} axisLine={false} tickFormatter={shortDay} />
            <YAxis hide />
            <Tooltip content={<SpendChartTooltip formatValue={format} />} />
            <Bar dataKey="tokens" name="当日" fill="var(--color-accent-500)" fillOpacity={0.45} radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="cumulative" name="累计" stroke="var(--color-chart-5)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </UsageChartCard>
    )
  }
  return <UsageBlocksHeatmap dailyTotal={model.dailyTotal} formatValue={format} />
}

function shortDay(value: string) {
  return String(value).slice(5)
}
