/**
 * 全景 Trace 顶部摘要指标面板 (Trace Summary Header)：
 * 对标 Langfuse / Datadog APM 顶级标准，呈现 Status, Duration, TTFO, Tokens, Spans, Trace ID
 * 与生命周期阶段耗时分解条 (TTFO 等待 vs 流式生成)。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
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

  const totalMs = data.totalDurationMs
  const ttfoMs = data.firstTokenMs ?? 0
  const hasTtfo = ttfoMs > 0 && totalMs > ttfoMs
  const streamMs = hasTtfo ? totalMs - ttfoMs : 0
  const ttfoPercent = totalMs > 0 ? (ttfoMs / totalMs) * 100 : 0
  const streamPercent = 100 - ttfoPercent

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
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

          {data.rootSpan.model ? (
            <span className="flex items-center gap-1.5 rounded-md bg-background-secondary-default px-2 py-0.5 font-mono text-caption-2-regular text-text-secondary">
              <ModelBrandIcon modelId={data.rootSpan.model} size={14} className="shrink-0" />
              <span className="font-semibold">{data.rootSpan.model}</span>
            </span>
          ) : null}

          <span
            className={cx(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption-2-bold font-mono font-bold uppercase",
              isSuccess
                ? "bg-state-success-text/10 text-state-success-text dark:text-state-success-text border border-state-success-text/20"
                : "bg-background-tertiary-error/10 text-text-error-primary dark:text-text-error-primary border border-border-error-default/20"
            )}
          >
            <span
              className={cx(
                "size-1.5 rounded-full",
                isSuccess ? "bg-state-success-base" : "bg-background-tertiary-error"
              )}
            />
            {data.status}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-caption-2-regular text-text-tertiary">
          <span>{data.startedAt}</span>
        </div>
      </div>

      {/* 核心指标矩阵网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-caption-2-regular">
        {/* 1. 总耗时 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-caption-2-regular text-text-tertiary uppercase">Duration (总耗时)</span>
          <span className="text-body-medium font-bold text-text-primary">
            {durationFormatted}
          </span>
        </div>

        {/* 2. 首字延迟 TTFO */}
        <div className="flex flex-col gap-0.5">
          <span className="text-caption-2-regular text-text-tertiary uppercase">First Token (TTFO)</span>
          <span className="text-body-medium font-bold text-status-yellow-text dark:text-status-yellow-text">
            {data.firstTokenMs ? `${data.firstTokenMs}ms` : "N/A"}
          </span>
        </div>

        {/* 3. Token 消耗 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-caption-2-regular text-text-tertiary uppercase">Tokens (Prompt/Out)</span>
          <span className="text-body-medium font-bold text-text-primary">
            {inK} in → {outK} out
          </span>
          {data.reasoningTokens ? (
            <span className="text-caption-2-regular text-chart-5 dark:text-chart-5">
              reasoning {data.reasoningTokens}
            </span>
          ) : null}
        </div>

        {/* 4. 模型架构 */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-caption-2-regular text-text-tertiary uppercase">Model (执行架构)</span>
          <div className="flex items-center gap-1.5 text-body-medium font-bold text-text-primary truncate">
            {data.rootSpan.model ? (
              <>
                <ModelBrandIcon modelId={data.rootSpan.model} size={15} className="shrink-0" />
                <span className="truncate">{data.rootSpan.model}</span>
              </>
            ) : (
              <span className="text-text-tertiary">default</span>
            )}
          </div>
        </div>

        {/* 5. 跨度 Spans */}
        <div className="flex flex-col gap-0.5">
          <span className="text-caption-2-regular text-text-tertiary uppercase">Spans (执行阶段)</span>
          <div className="flex items-center gap-1 text-body-medium font-bold text-text-primary">
            <span>{data.totalSpans} 阶段</span>
            {data.errorSpans > 0 ? (
              <span className="text-caption-2-regular font-normal text-text-error-primary">
                ({data.errorSpans} 异常)
              </span>
            ) : null}
          </div>
        </div>

        {/* 6. Trace ID */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-caption-2-regular text-text-tertiary uppercase">Trace ID</span>
          <div className="flex items-center gap-1 text-text-secondary truncate">
            <span className="truncate">{data.traceId}</span>
            <button
              type="button"
              onClick={handleCopyTraceId}
              className="text-text-tertiary hover:text-text-primary p-0.5"
              title="复制 Trace ID"
            >
              {copied ? (
                <RiCheckLine className="size-3 text-state-success-text" />
              ) : (
                <RiClipboardLine className="size-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 生命周期阶段耗时分解条 (Timing Breakdown Bar) */}
      {hasTtfo ? (
        <div className="flex flex-col gap-1.5 rounded-lg bg-background-secondary-default/40 p-2.5 border border-separator-border/40 font-mono text-caption-2-regular">
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary font-medium">执行生命周期耗时占比 (Lifecycle Timing Breakdown)</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-status-yellow-text dark:text-status-yellow-text font-semibold">
                <span className="size-2 rounded-full bg-status-yellow-background" />
                <span>TTFO 首字响应: {ttfoMs}ms ({ttfoPercent.toFixed(0)}%)</span>
              </span>
              <span className="flex items-center gap-1.5 text-accent-500 font-semibold">
                <span className="size-2 rounded-full bg-accent-500" />
                <span>流式生成传输: {streamMs}ms ({streamPercent.toFixed(0)}%)</span>
              </span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background-secondary-default flex shadow-inner">
            <div
              style={{ width: `${ttfoPercent}%` }}
              className="h-full bg-status-yellow-background transition-all"
              title={`TTFO 首字等待: ${ttfoMs}ms (${ttfoPercent.toFixed(1)}%)`}
            />
            <div
              style={{ width: `${streamPercent}%` }}
              className="h-full bg-accent-500 transition-all"
              title={`流式输出传输: ${streamMs}ms (${streamPercent.toFixed(1)}%)`}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
