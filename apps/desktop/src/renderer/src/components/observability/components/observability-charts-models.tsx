/**
 * 模型调用分布与成本估算看板 (Model Usage & Cost Estimation)：
 * 遵循 Vercel AI SDK 7 Token 统计标准，计算模型负载、成功率与预估费用消耗。
 */
import { useMemo } from "react"
import { RiCpuLine, RiMoneyDollarCircleLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

/** 常见模型的标准参考单价 (美元 / 百万 Token) */
const MODEL_PRICING: Record<string, { inPer1M: number; outPer1M: number }> = {
  "claude-3-5-sonnet": { inPer1M: 3.0, outPer1M: 15.0 },
  "claude-3-7-sonnet": { inPer1M: 3.0, outPer1M: 15.0 },
  "gpt-4o": { inPer1M: 2.5, outPer1M: 10.0 },
  "gpt-4o-mini": { inPer1M: 0.15, outPer1M: 0.6 },
  "deepseek-chat": { inPer1M: 0.14, outPer1M: 0.28 },
  "deepseek-reasoner": { inPer1M: 0.55, outPer1M: 2.19 },
  "grok-4.6": { inPer1M: 2.0, outPer1M: 10.0 },
  "grok-4.5": { inPer1M: 2.0, outPer1M: 10.0 },
  "grok-imagine-video": { inPer1M: 5.0, outPer1M: 20.0 }
}

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const norm = Object.keys(MODEL_PRICING).find((k) =>
    modelId.toLowerCase().includes(k)
  )
  const price = norm ? MODEL_PRICING[norm] : { inPer1M: 2.0, outPer1M: 10.0 }
  if (!price) return 0
  const costIn = (inputTokens / 1_000_000) * price.inPer1M
  const costOut = (outputTokens / 1_000_000) * price.outPer1M
  return costIn + costOut
}

export function ObservabilityModelsChart(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
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
        estimatedCost: number
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
        estimatedCost: 0,
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
      current.estimatedCost += estimateCost(id, inTok, outTok)

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
  const totalCost = modelStats.reduce((acc, s) => acc + s.estimatedCost, 0)

  if (modelStats.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-separator-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <RiCpuLine className="size-4 text-purple-500" />
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.observability.modelsTitle")}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
          <RiMoneyDollarCircleLine className="size-3.5" />
          <span>{t("pages.observability.estimatedTotal", { cost: totalCost.toFixed(4) })}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {modelStats.map((stat) => {
          const percent = totalCalls > 0 ? (stat.calls / totalCalls) * 100 : 0

          return (
            <div key={stat.modelId} className="flex flex-col gap-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-text-primary truncate max-w-[140px] sm:max-w-[240px]" title={stat.modelId}>
                    {stat.modelId}
                  </span>
                  {stat.estimatedCost > 0 ? (
                    <span className="text-[10px] text-text-tertiary shrink-0">
                      (~${stat.estimatedCost.toFixed(4)})
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 text-text-tertiary shrink-0 whitespace-nowrap">
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
                        ? "text-emerald-600 dark:text-emerald-400"
                        : stat.successRate >= 60
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {t("pages.observability.okPercent", { n: stat.successRate.toFixed(0) })}
                  </span>
                  <span>·</span>
                  <span>{stat.avgDurationMs >= 1000 ? `${(stat.avgDurationMs / 1000).toFixed(1)}s` : `${stat.avgDurationMs}ms`}</span>
                </div>
              </div>

              {/* 水平条形进度 (成功 vs 失败) */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-background-secondary-default flex">
                <div
                  style={{ width: `${(stat.successCalls / maxCalls) * 100}%` }}
                  className="h-full bg-blue-500 rounded-l-full transition-all"
                  title={t("pages.observability.successN", { n: stat.successCalls })}
                />
                {stat.failedCalls > 0 ? (
                  <div
                    style={{ width: `${(stat.failedCalls / maxCalls) * 100}%` }}
                    className="h-full bg-rose-500 rounded-r-full transition-all"
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
