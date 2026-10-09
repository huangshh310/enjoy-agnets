/**
 * 模型调用分布看板 (Model Usage)：
 * 遵循 Vercel AI SDK 7 Token 统计标准，计算模型负载、Token 消耗、成功率与耗时。
 * 不做费用估算：本地指标没有真实单价字段，禁止按 modelId 静态表猜价。
 */
import { useMemo } from "react"
import { RiCpuLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"

export function ObservabilityModelsChart(props: {
  metrics: TelemetryMetric[]
  selectedModel?: string | null
  onSelectModel?: (modelId: string | null) => void
}) {
  const { metrics, selectedModel, onSelectModel } = props
  const t = useT()

  const modelStats = useMemo(() => {
    const map = new Map<
      string,
      {
        modelId: string
        calls: number
        successCalls: number
        failedCalls: number
        inputTokens: number
        outputTokens: number
        totalTokens: number
        avgDurationMs: number
        durations: number[]
      }
    >()

    for (const m of metrics) {
      const id = m.modelId || "default-model"
      const current = map.get(id) ?? {
        modelId: id,
        calls: 0,
        successCalls: 0,
        failedCalls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        avgDurationMs: 0,
        durations: []
      }

      current.calls++
      const isSuccess =
        m.status === "success" || m.status === "completed" || m.status === "ok"
      if (isSuccess) current.successCalls++
      else current.failedCalls++

      const inTok = m.inputTokens ?? 0
      const outTok = m.outputTokens ?? 0
      current.inputTokens += inTok
      current.outputTokens += outTok
      current.totalTokens += inTok + outTok

      if (m.durationMs) current.durations.push(m.durationMs)

      map.set(id, current)
    }

    const list = Array.from(map.values()).map((item) => {
      const avgDurationMs =
        item.durations.length > 0
          ? Math.round(item.durations.reduce((a, b) => a + b, 0) / item.durations.length)
          : 0
      const successRate = (item.successCalls / item.calls) * 100
      return { ...item, avgDurationMs, successRate }
    })

    return list.sort((a, b) => b.calls - a.calls)
  }, [metrics])

  const totalCalls = metrics.length
  const maxCalls = Math.max(...modelStats.map((s) => s.calls), 1)

  if (modelStats.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs min-w-0">
      <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiCpuLine className="size-4 text-accent-500" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.modelsTitle")}
          </h3>
        </div>
        <span className="text-caption-2-regular font-mono text-text-tertiary">
          共 {modelStats.length} 个模型架构
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {modelStats.map((stat) => {
          const percent = totalCalls > 0 ? (stat.calls / totalCalls) * 100 : 0
          const isSelected = selectedModel === stat.modelId

          return (
            <div
              key={stat.modelId}
              onClick={() => onSelectModel?.(isSelected ? null : stat.modelId)}
              className={cx(
                "flex flex-col gap-1.5 font-mono text-caption-2-regular rounded-lg p-1.5 transition-colors cursor-pointer",
                isSelected
                  ? "bg-accent-500/10 ring-1 ring-accent-500/30"
                  : "hover:bg-background-secondary-hover/50"
              )}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ModelBrandIcon modelId={stat.modelId} size={15} className="shrink-0" />
                  <span
                    className="font-semibold text-text-primary truncate max-w-[130px] sm:max-w-[200px]"
                    title={stat.modelId}
                  >
                    {stat.modelId}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 text-text-tertiary shrink-0 whitespace-nowrap text-caption-2-regular">
                  {/* Token 消耗总计 */}
                  {stat.totalTokens > 0 ? (
                    <span
                      className="text-text-secondary font-medium"
                      title={`输入 ${formatTokens(stat.inputTokens)} · 输出 ${formatTokens(stat.outputTokens)}`}
                    >
                      {formatTokens(stat.totalTokens)} tok
                    </span>
                  ) : null}
                  <span>·</span>
                  <span className="text-text-secondary font-medium">
                    {t("pages.observability.timesPercent", {
                      n: stat.calls,
                      percent: percent.toFixed(0)
                    })}
                  </span>
                  <span>·</span>
                  <span
                    className={cx(
                      "font-semibold",
                      stat.successRate >= 90
                        ? "text-chart-success-text"
                        : stat.successRate >= 60
                          ? "text-chart-warning-text"
                          : "text-chart-danger-text"
                    )}
                  >
                    {t("pages.observability.okPercent", { n: stat.successRate.toFixed(0) })}
                  </span>
                  <span>·</span>
                  <span>
                    {stat.avgDurationMs >= 1000
                      ? `${(stat.avgDurationMs / 1000).toFixed(1)}s`
                      : `${stat.avgDurationMs}ms`}
                  </span>
                </div>
              </div>

              {/* 水平条形进度 (成功 vs 失败) */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-chart-track flex">
                <div
                  style={{ width: `${(stat.successCalls / maxCalls) * 100}%` }}
                  className="h-full bg-chart-success rounded-l-full transition-all"
                  title={t("pages.observability.successN", { n: stat.successCalls })}
                />
                {stat.failedCalls > 0 ? (
                  <div
                    style={{ width: `${(stat.failedCalls / maxCalls) * 100}%` }}
                    className="h-full bg-chart-danger rounded-r-full transition-all"
                    title={t("pages.observability.failN", { n: stat.failedCalls })}
                  />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
