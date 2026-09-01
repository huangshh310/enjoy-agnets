/**
 * 全景 Trace 顶部摘要指标面板 (Trace Summary Header)：
 * 对标 Langfuse / Datadog APM 顶级标准，呈现 Status, Duration, TTFO, Tokens, Cost, Trace ID 与环境。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { TraceSummaryData } from "../../types/trace-span.types"

export function TraceSummaryHeader(props: {
  data: TraceSummaryData
  onBack: () => void
}) {
  const { data, onBack } = props
  const [copied, setCopied] = useState(false)

  const isSuccess = data.status === "success"

  function handleCopyTraceId() {
    void navigator.clipboard.writeText(data.traceId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const durationFormatted =
    data.totalDurationMs >= 1000
      ? `${(data.totalDurationMs / 1000).toFixed(2)}s`
      : `${data.totalDurationMs}ms`

  const inK =
    data.inputTokens >= 1000
      ? `${(data.inputTokens / 1000).toFixed(1)}K`
      : String(data.inputTokens)
  const outK =
    data.outputTokens >= 1000
      ? `${(data.outputTokens / 1000).toFixed(1)}K`
      : String(data.outputTokens)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
      {/* 顶部标题行与快捷返回 */}
      <div className="flex items-center justify-between border-b border-separator-border/50 pb-3">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onBack}
            className="gap-1 h-7 text-caption-2-medium"
          >
            <span>← 返回日志列表</span>
          </Button>

          <h2 className="font-mono text-title-3-semibold font-bold text-text-primary tracking-tight">
            {data.name}
          </h2>

          <span
            className={cx(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-mono font-bold uppercase",
              isSuccess
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            )}
          >
            <span
              className={cx(
                "size-1.5 rounded-full",
                isSuccess ? "bg-emerald-500" : "bg-rose-500"
              )}
            />
            {data.status}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-text-tertiary">
          <span>{data.startedAt}</span>
        </div>
      </div>

      {/* 核心指标矩阵网格 (对标业界顶级 APM 看板) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-1 font-mono text-[11.5px]">
        {/* 1. 总耗时 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-text-tertiary uppercase">Duration</span>
          <span className="text-body-medium font-bold text-text-primary">
            {durationFormatted}
          </span>
        </div>

        {/* 2. 首字延迟 TTFO */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-text-tertiary uppercase">First Token (TTFO)</span>
          <span className="text-body-medium font-bold text-amber-600 dark:text-amber-400">
            {data.firstTokenMs ? `${data.firstTokenMs}ms` : "N/A"}
          </span>
        </div>

        {/* 3. Token 消耗 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-text-tertiary uppercase">Tokens</span>
          <span className="text-body-medium font-bold text-text-primary">
            {inK} in → {outK} out
          </span>
          {data.reasoningTokens ? (
            <span className="text-[9.5px] text-purple-600 dark:text-purple-400">
              reasoning {data.reasoningTokens}
            </span>
          ) : null}
        </div>

        {/* 4. 成本估算 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-text-tertiary uppercase">Cost (Est.)</span>
          <span className="text-body-medium font-bold text-emerald-600 dark:text-emerald-400">
            ${data.estimatedCost.toFixed(4)}
          </span>
        </div>

        {/* 5. 跨度 Spans */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-text-tertiary uppercase">Spans</span>
          <div className="flex items-center gap-1 text-body-medium font-bold text-text-primary">
            <span>{data.totalSpans}</span>
            {data.errorSpans > 0 ? (
              <span className="text-[10px] font-normal text-rose-500">
                ({data.errorSpans} error)
              </span>
            ) : null}
          </div>
        </div>

        {/* 6. Trace ID */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] text-text-tertiary uppercase">Trace ID</span>
          <div className="flex items-center gap-1 text-text-secondary truncate">
            <span className="truncate">{data.traceId}</span>
            <button
              type="button"
              onClick={handleCopyTraceId}
              className="text-text-tertiary hover:text-text-primary p-0.5"
              title="复制 Trace ID"
            >
              {copied ? (
                <RiCheckLine className="size-3 text-emerald-500" />
              ) : (
                <RiClipboardLine className="size-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
