/**
 * 耗时与 TTFO 时序趋势双轨面积图 (Timeline Area Chart)：
 * 使用 Recharts 响应式容器，像素级自适应任意屏幕宽度；
 * 支持平滑渐变面积、总耗时与 TTFO 双轨对照、丰富悬浮 Tooltip 探查。
 */
import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import { RiTimeLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { formatLatency } from "./model-routing/model-routing-row-cells"

interface TimelineDataPoint {
  id: string
  timeLabel: string
  fullTime: string
  duration: number
  ttfo: number
  modelId?: string
  kind: string
  status: string
}

export function ObservabilityTimelineChart(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const t = useT()

  const { chartData, p95Duration } = useMemo(() => {
    if (metrics.length === 0) return { chartData: [], p95Duration: 0 }

    const sorted = [...metrics].sort((a, b) => a.createdAt - b.createdAt)
    const durations = sorted.map((m) => m.durationMs ?? 0).sort((a, b) => a - b)
    const p95Idx = Math.floor(durations.length * 0.95)
    const p95 = durations[p95Idx] ?? durations[durations.length - 1] ?? 0

    const points: TimelineDataPoint[] = sorted.map((m, idx) => {
      const d = new Date(m.createdAt)
      const hours = String(d.getHours()).padStart(2, "0")
      const mins = String(d.getMinutes()).padStart(2, "0")
      const secs = String(d.getSeconds()).padStart(2, "0")
      const timeLabel = `${hours}:${mins}:${secs}`
      const fullTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })

      return {
        id: m.id || String(idx),
        timeLabel,
        fullTime,
        duration: m.durationMs ?? 0,
        ttfo: m.ttfoMs ?? 0,
        modelId: m.modelId,
        kind: m.kind,
        status: m.status
      }
    })

    return { chartData: points, p95Duration: p95 }
  }, [metrics])

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
      {/* 顶栏与图例 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiTimeLine className="size-4 text-accent-500 shrink-0" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.timelineTitle")}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-caption-2-medium">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent-500" />
            <span className="text-text-secondary">{t("pages.observability.legendDuration")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="text-text-secondary">{t("pages.observability.legendTtfo")}</span>
          </div>
          {p95Duration > 0 ? (
            <span className="rounded-md bg-background-secondary-default px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
              P95: {formatLatency(p95Duration)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Recharts 自适应容器 */}
      {chartData.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-caption-2-medium text-text-tertiary">
          {t("pages.observability.emptyTraces")}
        </div>
      ) : (
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="obsDurationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-500)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-accent-500)" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="obsTtfoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-warning)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-chart-warning)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatLatency}
              />
              <Tooltip content={<TimelineTooltip />} />
              {p95Duration > 0 ? (
                <ReferenceLine
                  y={p95Duration}
                  stroke="var(--color-chart-danger)"
                  strokeDasharray="4 3"
                  strokeWidth={1.2}
                  label={{
                    value: `P95: ${formatLatency(p95Duration)}`,
                    fill: "var(--color-chart-danger)",
                    fontSize: 9.5,
                    position: "insideTopRight"
                  }}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="duration"
                name={t("pages.observability.legendDuration")}
                stroke="var(--color-accent-500)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#obsDurationGrad)"
              />
              <Area
                type="monotone"
                dataKey="ttfo"
                name={t("pages.observability.legendTtfo")}
                stroke="var(--color-chart-warning)"
                strokeWidth={1.5}
                strokeDasharray="3 2"
                fillOpacity={1}
                fill="url(#obsTtfoGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function TimelineTooltip({
  active,
  payload
}: {
  active?: boolean
  payload?: Array<{ payload: TimelineDataPoint }>
}) {
  const t = useT()
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0]?.payload
  if (!data) return null

  const isSuccess = data.status === "success" || data.status === "completed" || data.status === "ok"

  return (
    <div className="flex min-w-[11rem] flex-col gap-1.5 rounded-xl border border-separator-border/80 bg-background-primary-default p-2.5 font-mono text-[11px] shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-separator-border/50 pb-1.5">
        <span className="font-semibold text-text-primary">{data.fullTime}</span>
        <span
          className={cx(
            "rounded px-1 py-0.5 text-[9.5px] uppercase font-bold",
            isSuccess
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          )}
        >
          {data.status}
        </span>
      </div>

      <div className="flex items-center gap-1.5 min-w-0">
        <ModelBrandIcon modelId={data.modelId} size={13} className="shrink-0" />
        <span className="truncate text-text-secondary font-medium" title={data.modelId}>
          {data.modelId ?? t("pages.observability.default")}
        </span>
      </div>

      <div className="mt-0.5 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-tertiary">{t("pages.observability.tooltipDuration")}</span>
          <span className="font-semibold text-accent-500 tabular-nums">
            {formatLatency(data.duration)}
          </span>
        </div>
        {data.ttfo > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-tertiary">{t("pages.observability.tooltipTtfo")}</span>
            <span className="font-semibold text-amber-500 tabular-nums">
              {formatLatency(data.ttfo)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
