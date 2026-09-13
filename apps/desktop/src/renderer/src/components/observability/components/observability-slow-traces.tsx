/**
 * 慢调用与异常瓶颈透视看板 (Latency Outliers & Critical Traces Focus)：
 * 自动识别高耗时长尾请求、报错链路与最新实时动态，直通火焰图时间线与全景诊断。
 */
import { useMemo, useState } from "react"
import {
  RiArrowRightLine,
  RiFilterLine,
  RiPulseLine,
  RiTimerFlashLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { formatLatency } from "./model-routing/model-routing-row-cells"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"

type TableViewMode = "outliers" | "recent"
type OutlierFilter = "all" | "errors" | "slow5s"

export function ObservabilitySlowTraces(props: {
  metrics: TelemetryMetric[]
  onInspect?: (metric: TelemetryMetric) => void
}) {
  const { metrics, onInspect } = props
  const t = useT()
  const [viewMode, setViewMode] = useState<TableViewMode>("outliers")
  const [filter, setFilter] = useState<OutlierFilter>("all")

  // 1. 瓶颈与异常调用
  const outlierTraces = useMemo(() => {
    if (metrics.length === 0) return []

    const failed = metrics.filter(
      (m) => m.status === "failed" || m.status === "error" || (m.errorClass && m.errorClass !== "ok")
    )
    const sortedByDuration = [...metrics].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
    const topSlow = sortedByDuration.slice(0, 10)

    const map = new Map<string, TelemetryMetric>()
    for (const m of [...failed, ...topSlow]) {
      map.set(m.id, m)
    }

    return Array.from(map.values()).sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
  }, [metrics])

  // 2. 最近实时调用
  const recentTraces = useMemo(() => {
    return [...metrics].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
  }, [metrics])

  // 3. 根据当前视图和子筛选过滤
  const displayedList = useMemo(() => {
    const base = viewMode === "outliers" ? outlierTraces : recentTraces
    if (filter === "errors") {
      return base.filter(
        (m) => m.status === "failed" || m.status === "error" || (m.errorClass && m.errorClass !== "ok")
      )
    }
    if (filter === "slow5s") {
      return base.filter((m) => (m.durationMs ?? 0) >= 5000)
    }
    return base
  }, [viewMode, outlierTraces, recentTraces, filter])

  if (metrics.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs font-mono text-[11px] min-w-0">
      {/* 顶栏视图切换与筛选 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-separator-border/50 pb-3">
        {/* 左侧 Tab 切换 */}
        <div className="flex items-center gap-1.5 rounded-lg bg-background-secondary-default p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("outliers")}
            className={cx(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              viewMode === "outliers"
                ? "bg-background-primary-default text-text-primary shadow-2xs"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            <RiTimerFlashLine className="size-3.5 text-amber-500" />
            <span>慢调用与异常聚焦</span>
            <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[9.5px] text-amber-600 dark:text-amber-400">
              {outlierTraces.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("recent")}
            className={cx(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              viewMode === "recent"
                ? "bg-background-primary-default text-text-primary shadow-2xs"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            <RiPulseLine className="size-3.5 text-accent-500" />
            <span>最近执行流</span>
            <span className="rounded bg-accent-500/10 px-1 py-0.2 text-[9.5px] text-accent-600 dark:text-accent-400">
              {recentTraces.length}
            </span>
          </button>
        </div>

        {/* 右侧微调过滤器 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10.5px]">
            <RiFilterLine className="size-3 text-text-tertiary" />
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cx(
                "rounded px-2 py-0.5 transition-colors",
                filter === "all"
                  ? "bg-background-secondary-default text-text-primary font-semibold"
                  : "text-text-tertiary hover:text-text-primary"
              )}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => setFilter("errors")}
              className={cx(
                "rounded px-2 py-0.5 transition-colors",
                filter === "errors"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold"
                  : "text-text-tertiary hover:text-rose-500"
              )}
            >
              仅异常
            </button>
            <button
              type="button"
              onClick={() => setFilter("slow5s")}
              className={cx(
                "rounded px-2 py-0.5 transition-colors",
                filter === "slow5s"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                  : "text-text-tertiary hover:text-amber-500"
              )}
            >
              &gt;5s 慢调用
            </button>
          </div>

          <span className="hidden sm:inline text-caption-2-medium text-text-tertiary">
            点击记录即开 Flame Chart 火焰图与 Span 树
          </span>
        </div>
      </div>

      {/* 表格区 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[50rem] text-left">
          <thead className="text-[10px] uppercase text-text-tertiary border-b border-separator-border/40">
            <tr>
              <th className="px-3 py-2 font-medium w-10">序号</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium">模型架构</th>
              <th className="px-3 py-2 font-medium text-right">总耗时</th>
              <th className="px-3 py-2 font-medium text-right">首字 TTFO</th>
              <th className="px-3 py-2 font-medium text-right">Token 规模 (In/Out)</th>
              <th className="px-3 py-2 font-medium">类型 / 异常类目</th>
              <th className="px-3 py-2 font-medium">时间</th>
              <th className="px-3 py-2 font-medium text-right">全景诊断</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-separator-border/30">
            {displayedList.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-text-tertiary text-[11px]">
                  没有匹配的执行链路
                </td>
              </tr>
            ) : (
              displayedList.map((item, idx) => {
                const isSuccess =
                  item.status === "success" || item.status === "completed" || item.status === "ok"
                const duration = item.durationMs ?? 0
                const ttfo = item.ttfoMs ?? 0
                const inTok = item.inputTokens ?? 0
                const outTok = item.outputTokens ?? 0
                const totalTok = inTok + outTok
                const timeStr = new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                })

                return (
                  <tr
                    key={item.id}
                    onClick={() => onInspect?.(item)}
                    className="group hover:bg-background-secondary-hover/40 transition-colors cursor-pointer"
                  >
                    {/* 序号 */}
                    <td className="px-3 py-2.5 text-text-tertiary text-[10px]">
                      #{idx + 1}
                    </td>

                    {/* 状态 */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={cx(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] uppercase font-bold",
                          isSuccess
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        )}
                      >
                        <span
                          className={cx(
                            "size-1.5 rounded-full",
                            isSuccess ? "bg-emerald-500" : "bg-rose-500"
                          )}
                        />
                        {item.status}
                      </span>
                    </td>

                    {/* 模型 */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 min-w-0 max-w-[14rem]">
                        <ModelBrandIcon modelId={item.modelId} size={14} className="shrink-0" />
                        <span className="truncate font-semibold text-text-primary" title={item.modelId}>
                          {item.modelId ?? t("pages.observability.default")}
                        </span>
                      </div>
                    </td>

                    {/* 耗时 */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <span
                        className={cx(
                          "font-bold tabular-nums",
                          duration >= 10000
                            ? "text-rose-600 dark:text-rose-400"
                            : duration >= 3000
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-text-primary"
                        )}
                      >
                        {formatLatency(duration)}
                      </span>
                    </td>

                    {/* 首字 TTFO */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums text-text-secondary">
                      {ttfo > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {formatLatency(ttfo)}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>

                    {/* Token 规模 */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums text-text-secondary">
                      {totalTok > 0 ? (
                        <span title={`输入: ${inTok} · 输出: ${outTok}`}>
                          <strong className="text-text-primary">{formatTokens(totalTok)}</strong>
                          <span className="text-[9.5px] text-text-tertiary ml-1">
                            ({formatTokens(inTok)}/{formatTokens(outTok)})
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* 类型与异常 */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-[9.5px] uppercase text-text-tertiary">
                          {item.kind}
                        </span>
                        {item.errorClass && item.errorClass !== "ok" ? (
                          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600 dark:text-rose-400">
                            {item.errorClass}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* 记录时间 */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-text-tertiary">
                      {timeStr}
                    </td>

                    {/* 诊断操作按钮 */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onInspect?.(item)
                        }}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-accent-500 hover:bg-accent-500/10 transition-colors"
                      >
                        <span>🔥 火焰图诊断</span>
                        <RiArrowRightLine className="size-3" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
