/**
 * Vercel AI SDK 7 Token 细分与吞吐时序复合图 (Throughput Composed Chart)：
 * 使用 Recharts 响应式容器，支持 Prompt/Completion Token 堆叠柱与 TPS 吞吐曲线双轴对照。
 */
import { useMemo } from "react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import { RiSpeedUpLine } from "@remixicon/react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"

interface ThroughputDataPoint {
  id: string
  timeLabel: string
  fullTime: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  tokensPerSecond: number
  modelId?: string
  status: string
}

export function ObservabilityThroughputChart(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const t = useT()

  const { chartData, maxTps, avgTps } = useMemo(() => {
    if (metrics.length === 0) return { chartData: [], maxTps: 0, avgTps: 0 }

    const sorted = [...metrics].sort((a, b) => a.createdAt - b.createdAt)
    let peakTps = 0

    const points: ThroughputDataPoint[] = sorted.map((m, idx) => {
      const d = new Date(m.createdAt)
      const hours = String(d.getHours()).padStart(2, "0")
      const mins = String(d.getMinutes()).padStart(2, "0")
      const secs = String(d.getSeconds()).padStart(2, "0")
      const timeLabel = `${hours}:${mins}:${secs}`
      const fullTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })

      const promptTokens = m.inputTokens ?? 0
      const completionTokens = m.outputTokens ?? 0
      const totalTokens = promptTokens + completionTokens
      const tokensPerSecond = Number((m.tokensPerSecond ?? 0).toFixed(1))
      if (tokensPerSecond > peakTps) peakTps = tokensPerSecond

      return {
        id: m.id || String(idx),
        timeLabel,
        fullTime,
        promptTokens,
        completionTokens,
        totalTokens,
        tokensPerSecond,
        modelId: m.modelId,
        status: m.status
      }
    })

    const avgTps =
      points.length > 0
        ? Number((points.reduce((acc, p) => acc + p.tokensPerSecond, 0) / points.length).toFixed(1))
        : 0

    return { chartData: points, maxTps: peakTps, avgTps }
  }, [metrics])

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
      {/* 顶栏与图例 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiSpeedUpLine className="size-4 text-emerald-500 shrink-0" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.throughputTitle")}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-caption-2-medium">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-2" />
            <span className="text-text-secondary">{t("pages.observability.promptIn")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent-500" />
            <span className="text-text-secondary">{t("pages.observability.completionOut")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-text-secondary">{t("pages.observability.rateToks")}</span>
          </div>
          {maxTps > 0 ? (
            <span className="rounded-md bg-background-secondary-default px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
              Peak: {maxTps} t/s
            </span>
          ) : null}
        </div>
      </div>

      {/* Recharts 自适应双轴图 */}
      {chartData.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-caption-2-medium text-text-tertiary">
          {t("pages.observability.emptyTraces")}
        </div>
      ) : (
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-separator-border)"
                opacity={0.35}
              />
              <XAxis
                dataKey="timeLabel"
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-separator-border)", opacity: 0.4 }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                yAxisId="tokens"
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatTokens(v)}
              />
              <YAxis
                yAxisId="tps"
                orientation="right"
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<ThroughputTooltip />} />
              {avgTps > 0 ? (
                <ReferenceLine
                  yAxisId="tps"
                  y={avgTps}
                  stroke="#10b981"
                  strokeDasharray="4 3"
                  strokeWidth={1.2}
                  label={{
                    value: `Avg: ${avgTps} t/s`,
                    fill: "#10b981",
                    fontSize: 9.5,
                    position: "insideTopRight"
                  }}
                />
              ) : null}
              <Bar
                yAxisId="tokens"
                dataKey="promptTokens"
                name={t("pages.observability.promptIn")}
                stackId="tokens"
                fill="var(--color-chart-2)"
                fillOpacity={0.65}
                barSize={14}
              />
              <Bar
                yAxisId="tokens"
                dataKey="completionTokens"
                name={t("pages.observability.completionOut")}
                stackId="tokens"
                fill="var(--color-accent-500)"
                fillOpacity={0.85}
                radius={[3, 3, 0, 0]}
                barSize={14}
              />
              <Line
                yAxisId="tps"
                type="monotone"
                dataKey="tokensPerSecond"
                name={t("pages.observability.rateToks")}
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function ThroughputTooltip({
  active,
  payload
}: {
  active?: boolean
  payload?: Array<{ payload: ThroughputDataPoint }>
}) {
  const t = useT()
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="flex min-w-[11rem] flex-col gap-1.5 rounded-xl border border-separator-border/80 bg-background-primary-default p-2.5 font-mono text-[11px] shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-separator-border/50 pb-1.5">
        <span className="font-semibold text-text-primary">{data.fullTime}</span>
        {data.tokensPerSecond > 0 ? (
          <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">
            {data.tokensPerSecond} t/s
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 min-w-0">
        <ModelBrandIcon modelId={data.modelId} size={13} className="shrink-0" />
        <span className="truncate text-text-secondary font-medium" title={data.modelId}>
          {data.modelId ?? t("pages.observability.default")}
        </span>
      </div>

      <div className="mt-0.5 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-tertiary">{t("pages.observability.promptIn")}</span>
          <span className="font-semibold text-chart-2 tabular-nums">
            {formatTokens(data.promptTokens)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-tertiary">{t("pages.observability.completionOut")}</span>
          <span className="font-semibold text-accent-500 tabular-nums">
            {formatTokens(data.completionTokens)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-separator-border/30 pt-0.5">
          <span className="text-text-tertiary">{t("pages.observability.cliUsageTotal")}</span>
          <span className="font-semibold text-text-primary tabular-nums">
            {formatTokens(data.totalTokens)}
          </span>
        </div>
      </div>
    </div>
  )
}
