/**
 * AI APM 性能洞察与优化诊断卡片 (Observability Insights Card)：
 * 实时分析筛选窗口内的指标特征，提炼长尾耗时、异常归因、流式首字效率与负载画像。
 */
import { useMemo, useState } from "react"
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiFlashlightLine,
  RiLightbulbLine,
  RiSparklingLine,
  RiTimerLine
} from "@remixicon/react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { formatLatency } from "./model-routing/model-routing-row-cells"

export function ObservabilityInsightsCard(props: { metrics: TelemetryMetric[] }) {
  const { metrics } = props
  const [collapsed, setCollapsed] = useState(false)

  const insights = useMemo(() => {
    if (metrics.length === 0) return null

    const total = metrics.length
    const successList = metrics.filter(
      (m) => m.status === "success" || m.status === "completed" || m.status === "ok"
    )
    const failedList = metrics.filter(
      (m) => m.status === "failed" || m.status === "error" || (m.errorClass && m.errorClass !== "ok")
    )
    const successRate = (successList.length / total) * 100

    // 1. 耗时与 P95
    const durations = metrics.map((m) => m.durationMs ?? 0).sort((a, b) => a - b)
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / total)
    const p95Idx = Math.floor(durations.length * 0.95)
    const p95Duration = durations[p95Idx] ?? durations[durations.length - 1] ?? 0

    // 寻找耗时最高或慢调用集中的模型
    const modelSlowCount = new Map<string, { count: number; totalDuration: number }>()
    for (const m of metrics) {
      const id = m.modelId || "default"
      const cur = modelSlowCount.get(id) ?? { count: 0, totalDuration: 0 }
      cur.count++
      cur.totalDuration += m.durationMs ?? 0
      modelSlowCount.set(id, cur)
    }
    let slowestModel = ""
    let maxAvgDuration = 0
    for (const [id, stat] of modelSlowCount.entries()) {
      const avg = stat.totalDuration / stat.count
      if (avg > maxAvgDuration) {
        maxAvgDuration = avg
        slowestModel = id
      }
    }

    // 2. 异常归因
    const errorMap = new Map<string, number>()
    for (const m of failedList) {
      const err = m.errorClass || "other_error"
      errorMap.set(err, (errorMap.get(err) ?? 0) + 1)
    }
    const topError = Array.from(errorMap.entries()).sort((a, b) => b[1] - a[1])[0]

    // 3. 首字延迟与吞吐
    const ttfos = metrics
      .map((m) => m.ttfoMs)
      .filter((v): v is number => typeof v === "number" && v > 0)
    const avgTtfo = ttfos.length > 0 ? Math.round(ttfos.reduce((a, b) => a + b, 0) / ttfos.length) : 0

    let peakTps = 0
    for (const m of metrics) {
      if (m.tokensPerSecond && m.tokensPerSecond > peakTps) {
        peakTps = m.tokensPerSecond
      }
    }

    // 4. 工作负载
    const agentCalls = metrics.filter((m) => m.kind.toLowerCase() === "agent").length
    const agentPercent = Math.round((agentCalls / total) * 100)

    return {
      total,
      successRate,
      avgDuration,
      p95Duration,
      slowestModel,
      maxAvgDuration: Math.round(maxAvgDuration),
      failedCount: failedList.length,
      topError: topError ? { type: topError[0], count: topError[1] } : null,
      avgTtfo,
      peakTps: Number(peakTps.toFixed(1)),
      agentPercent
    }
  }, [metrics])

  if (!insights) return null

  return (
    <div className="flex flex-col rounded-xl border border-separator-border/70 bg-gradient-to-r from-accent-500/[0.04] via-background-primary-default to-background-secondary-default/30 p-3.5 shadow-2xs transition-all">
      {/* 卡片头部 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
            <RiSparklingLine className="size-3.5" />
          </div>
          <span className="text-caption-1-medium font-semibold text-text-primary">
            AI APM 智能性能洞察与优化建议
          </span>
          <span className="rounded-full bg-accent-500/10 px-2 py-0.5 font-mono text-caption-2-semibold font-semibold text-accent-600 dark:text-accent-400">
            基于 {insights.total} 条采样实时生成
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-caption-2-regular text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
        >
          <span>{collapsed ? "展开诊断" : "收起"}</span>
          {collapsed ? <RiArrowDownSLine className="size-3.5" /> : <RiArrowUpSLine className="size-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 font-mono text-caption-2-regular">
          {/* 洞察 1: 延迟与长尾 */}
          <div className="flex flex-col justify-between rounded-lg border border-separator-border/60 bg-background-primary-default/80 p-2.5 shadow-3xs">
            <div className="flex items-center gap-1.5 text-accent-500">
              <RiTimerLine className="size-3.5 shrink-0" />
              <span className="font-semibold text-text-primary">P95 长尾延迟</span>
            </div>
            <p className="mt-1.5 text-caption-2-regular leading-relaxed text-text-secondary">
              P95 延迟为{" "}
              <strong className="text-text-primary">{formatLatency(insights.p95Duration)}</strong>
              {insights.slowestModel ? (
                <>
                  ，长耗时集中于 <span className="text-accent-500 font-semibold">{insights.slowestModel}</span>（均值{" "}
                  {formatLatency(insights.maxAvgDuration)}）。
                </>
              ) : (
                "。"
              )}
            </p>
          </div>

          {/* 洞察 2: 异常溯源 */}
          <div className="flex flex-col justify-between rounded-lg border border-separator-border/60 bg-background-primary-default/80 p-2.5 shadow-3xs">
            <div className="flex items-center gap-1.5 text-text-error-primary">
              <RiAlertLine className="size-3.5 shrink-0" />
              <span className="font-semibold text-text-primary">运行稳定性</span>
            </div>
            <p className="mt-1.5 text-caption-2-regular leading-relaxed text-text-secondary">
              {insights.failedCount === 0 ? (
                <span className="text-state-success-text dark:text-state-success-text font-medium">
                  全部调用均正常完成，当前窗口未捕获任何异常。
                </span>
              ) : (
                <>
                  成功率{" "}
                  <strong
                    className={
                      insights.successRate >= 80 ? "text-state-success-text dark:text-state-success-text" : "text-text-error-primary"
                    }
                  >
                    {insights.successRate.toFixed(1)}%
                  </strong>
                  ，主要异常归因于{" "}
                  <span className="font-semibold text-text-error-primary">
                    {insights.topError?.type ?? "未知"}
                  </span>
                  （{insights.topError?.count} 次）。
                </>
              )}
            </p>
          </div>

          {/* 洞察 3: 首字响应与流式效率 */}
          <div className="flex flex-col justify-between rounded-lg border border-separator-border/60 bg-background-primary-default/80 p-2.5 shadow-3xs">
            <div className="flex items-center gap-1.5 text-status-yellow-text">
              <RiFlashlightLine className="size-3.5 shrink-0" />
              <span className="font-semibold text-text-primary">流式首字与吞吐</span>
            </div>
            <p className="mt-1.5 text-caption-2-regular leading-relaxed text-text-secondary">
              首字平均延时{" "}
              <strong className="text-text-primary">
                {insights.avgTtfo > 0 ? formatLatency(insights.avgTtfo) : "—"}
              </strong>
              ，包含思考推理首包；吞吐峰值达{" "}
              <strong className="text-state-success-text dark:text-state-success-text">{insights.peakTps} tok/s</strong>。
            </p>
          </div>

          {/* 洞察 4: 负载画像与调优建议 */}
          <div className="flex flex-col justify-between rounded-lg border border-separator-border/60 bg-background-primary-default/80 p-2.5 shadow-3xs">
            <div className="flex items-center gap-1.5 text-accent-500">
              <RiLightbulbLine className="size-3.5 shrink-0" />
              <span className="font-semibold text-text-primary">场景特征与建议</span>
            </div>
            <p className="mt-1.5 text-caption-2-regular leading-relaxed text-text-secondary">
              <strong className="text-text-primary">{insights.agentPercent}%</strong> 请求为 Agent 多轮调度；
              {insights.failedCount > 0 ? "建议为高频 Provider 配置短超时熔断与退避重试。" : "建议开启流式思考块提前渲染体验。"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
