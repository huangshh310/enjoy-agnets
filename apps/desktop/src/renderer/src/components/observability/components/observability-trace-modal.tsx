/**
 * 可观测性 Trace 深度诊断分析抽屉 / 弹窗组件：
 * 采用专业宽幅 APM (Datadog / Langfuse / Sentry) 视图 (sm:max-w-5xl)，
 * 提供执行生命周期耗时瀑布流、Vercel AI SDK 7 OTEL 语义属性表与全高原始脱敏载荷。
 */
import { useState } from "react"
import {
  RiBarChartHorizontalLine,
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiCodeSSlashLine,
  RiDashboardLine,
  RiInformationLine,
  RiKey2Line,
  RiPulseLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getTraceErrorHint, getTraceOtelRows } from "./observability-trace-copy"

type TraceModalTab = "overview" | "attributes" | "json"

export function ObservabilityTraceModal(props: {
  metric: TelemetryMetric | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { metric, open, onOpenChange } = props
  const t = useT()
  const [activeTab, setActiveTab] = useState<TraceModalTab>("overview")
  const [copied, setCopied] = useState(false)
  const [copiedRunId, setCopiedRunId] = useState(false)

  if (!metric) return null

  const isSuccess =
    metric.status === "success" || metric.status === "completed" || metric.status === "ok"
  const isRunning = metric.status === "running"

  const duration = metric.durationMs ?? 0
  const ttfo = metric.ttfoMs ?? 0
  const streamDuration = Math.max(duration - ttfo, 0)
  const ttfoRatio = duration > 0 ? (ttfo / duration) * 100 : 0
  const streamRatio = duration > 0 ? (streamDuration / duration) * 100 : 0

  const inTok = metric.inputTokens ?? 0
  const outTok = metric.outputTokens ?? 0
  const totalTokens = inTok + outTok

  const timeFormatted = new Date(metric.createdAt).toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })

  const rawJson = JSON.stringify(metric, null, 2)
  const otelAttributes = getTraceOtelRows(metric, t, {
    duration,
    ttfo,
    inTok,
    outTok,
    totalTokens,
    timeFormatted
  })

  function handleCopyJson() {
    void navigator.clipboard.writeText(rawJson).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleCopyRunId() {
    void navigator.clipboard.writeText(metric?.runId || metric?.id || "").then(() => {
      setCopiedRunId(true)
      setTimeout(() => setCopiedRunId(false), 2000)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[94vw] sm:max-w-4xl lg:sm:max-w-5xl p-0 gap-0 overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-2xl"
      >
        {/* 顶部标题栏 */}
        <div className="flex flex-col gap-3 border-b border-separator-border/70 px-6 py-4 bg-background-secondary-default/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cx(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs",
                  isSuccess
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : isRunning
                      ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {isSuccess ? (
                  <RiCheckLine className="size-4" />
                ) : isRunning ? (
                  <RiPulseLine className="size-4 animate-pulse" />
                ) : (
                  <RiCloseLine className="size-4" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-body-medium font-bold text-text-primary tracking-tight">
                    {t("pages.observability.executionTrace", { kind: metric.kind.toUpperCase() })}
                  </DialogTitle>
                  <span className="rounded bg-background-secondary-default px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase text-text-secondary">
                    {metric.modelId ?? t("pages.observability.default")}
                  </span>
                  <span
                    className={cx(
                      "rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase",
                      isSuccess
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : isRunning
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {metric.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-text-tertiary mt-0.5">
                  <span className="truncate max-w-[340px]">
                    {t("pages.observability.runId", { id: metric.runId })}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRunId}
                    className="hover:text-text-primary text-[10.5px] text-accent-600 dark:text-accent-400 transition-colors"
                  >
                    {copiedRunId ? t("common.copied") : t("pages.observability.copyId")}
                  </button>
                  <span>·</span>
                  <span>{timeFormatted}</span>
                </div>
              </div>
            </div>

            {/* 右侧：复制 JSON 与 自定义关闭按钮 */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyJson}
                className="gap-1 h-7 text-caption-2-medium"
              >
                {copied ? (
                  <>
                    <RiCheckLine className="size-3 text-emerald-500" />
                    <span>{t("pages.observability.copiedJson")}</span>
                  </>
                ) : (
                  <>
                    <RiClipboardLine className="size-3" />
                    <span>{t("pages.observability.copyJson")}</span>
                  </>
                )}
              </Button>

              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="size-7 text-text-tertiary hover:text-text-primary"
                title={t("common.close")}
              >
                <RiCloseLine className="size-4" />
              </Button>
            </div>
          </div>

          {/* 标签栏切换 (单行不折行) */}
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-separator-border/40 overflow-x-auto whitespace-nowrap">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-medium transition-all shrink-0",
                activeTab === "overview"
                  ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <RiDashboardLine className="size-3.5" />
              <span>{t("pages.observability.tabOverview")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("attributes")}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-medium transition-all shrink-0",
                activeTab === "attributes"
                  ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <RiKey2Line className="size-3.5" />
              <span>{t("pages.observability.tabAttributes")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("json")}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-medium transition-all shrink-0",
                activeTab === "json"
                  ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <RiCodeSSlashLine className="size-3.5" />
              <span>{t("pages.observability.tabRaw")}</span>
            </button>
          </div>
        </div>

        {/* 主体内容区域 */}
        <div className="p-6 max-h-[75vh] overflow-y-auto flex flex-col gap-4.5">
          {/* TAB 1: 性能概览与瀑布流 */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-4">
              {/* 四格核心 KPI 指标 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-3.5 shadow-2xs">
                  <div className="text-[10.5px] text-text-tertiary">
                    {t("pages.observability.totalDuration")}
                  </div>
                  <div className="text-title-3-semibold font-bold text-text-primary mt-1">
                    {duration >= 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`}
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">
                    {t("pages.observability.e2eTime")}
                  </div>
                </div>

                <div className="rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-3.5 shadow-2xs">
                  <div className="text-[10.5px] text-text-tertiary">
                    {t("pages.observability.firstTokenTtfo")}
                  </div>
                  <div className="text-title-3-semibold font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {ttfo > 0 ? `${ttfo}ms` : t("pages.observability.na")}
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">
                    {ttfo > 0
                      ? t("pages.observability.ofDuration", { n: ttfoRatio.toFixed(0) })
                      : t("pages.observability.nonStreaming")}
                  </div>
                </div>

                <div className="rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-3.5 shadow-2xs">
                  <div className="text-[10.5px] text-text-tertiary">
                    {t("pages.observability.tokenInOut")}
                  </div>
                  <div className="text-title-3-semibold font-bold text-text-primary mt-1">
                    {inTok} / {outTok}
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">
                    {t("pages.observability.totalTokens", { n: totalTokens })}
                  </div>
                </div>

                <div className="rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-3.5 shadow-2xs">
                  <div className="text-[10.5px] text-text-tertiary">
                    {t("pages.observability.genThroughput")}
                  </div>
                  <div className="text-title-3-semibold font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {metric.tokensPerSecond
                      ? t("pages.observability.tPerS", { n: metric.tokensPerSecond.toFixed(1) })
                      : t("pages.observability.na")}
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">
                    {t("pages.observability.avgTokenRate")}
                  </div>
                </div>
              </div>

              {/* 生命周期耗时瀑布流拆解 (Waterfall Timeline) */}
              <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-secondary-default/20 p-4.5">
                <div className="flex items-center justify-between text-caption-1-medium font-semibold text-text-primary">
                  <div className="flex items-center gap-1.5">
                    <RiBarChartHorizontalLine className="size-4 text-accent-500" />
                    <span>{t("pages.observability.waterfallTitle")}</span>
                  </div>
                  <span className="font-mono text-[11px] text-text-tertiary">
                    {t("pages.observability.msTotal", { n: duration })}
                  </span>
                </div>

                {/* 阶段条形堆叠 */}
                <div className="flex flex-col gap-2.5 font-mono text-[11px]">
                  {/* 整体时间轴 */}
                  <div className="h-3 w-full rounded-full bg-background-secondary-default overflow-hidden flex shadow-inner">
                    {ttfo > 0 ? (
                      <div
                        style={{ width: `${ttfoRatio}%` }}
                        className="h-full bg-amber-500 transition-all"
                        title={t("pages.observability.waitFirst", {
                          n: ttfo,
                          percent: ttfoRatio.toFixed(0)
                        })}
                      />
                    ) : null}
                    {streamDuration > 0 ? (
                      <div
                        style={{ width: `${streamRatio}%` }}
                        className="h-full bg-blue-500 transition-all"
                        title={t("pages.observability.streamXfer", {
                          n: streamDuration,
                          percent: streamRatio.toFixed(0)
                        })}
                      />
                    ) : null}
                  </div>

                  {/* 阶段明细行 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                    <div className="flex items-center justify-between rounded-lg border border-separator-border/60 bg-background-primary-default p-3 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-amber-500" />
                        <span className="text-text-secondary font-medium">
                          {t("pages.observability.phaseTtfo")}
                        </span>
                      </div>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {ttfo > 0 ? `${ttfo}ms (${ttfoRatio.toFixed(0)}%)` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-separator-border/60 bg-background-primary-default p-3 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-blue-500" />
                        <span className="text-text-secondary font-medium">
                          {t("pages.observability.phaseStream")}
                        </span>
                      </div>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {streamDuration > 0
                          ? `${streamDuration}ms (${streamRatio.toFixed(0)}%)`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 错误根因与排查指引 (针对异常请求) */}
              {metric.errorClass && metric.errorClass !== "ok" ? (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-4 flex flex-col gap-1.5 text-[11.5px]">
                  <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                    <RiInformationLine className="size-4 shrink-0" />
                    <span>
                      {t("pages.observability.errorClass", { errorClass: metric.errorClass })}
                    </span>
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    {getTraceErrorHint(metric.errorClass, t)}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: AI SDK 7 / OTEL 语义属性表 */}
          {activeTab === "attributes" && (
            <div className="flex flex-col rounded-xl border border-separator-border/70 overflow-hidden font-mono text-[11px] shadow-2xs">
              <div className="grid grid-cols-12 bg-background-secondary-default/70 px-4 py-2.5 font-semibold text-text-tertiary border-b border-separator-border/60">
                <div className="col-span-5">{t("pages.observability.attrColName")}</div>
                <div className="col-span-3">{t("pages.observability.attrColLabel")}</div>
                <div className="col-span-4">{t("pages.observability.attrColValue")}</div>
              </div>

              <div className="divide-y divide-separator-border/40 bg-background-primary-default">
                {otelAttributes.map((attr) => (
                  <div
                    key={attr.key}
                    className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-background-secondary-hover/30 transition-colors"
                  >
                    <div className="col-span-5 font-bold text-accent-600 dark:text-accent-400 truncate">
                      {attr.key}
                    </div>
                    <div className="col-span-3 text-text-secondary truncate">{attr.label}</div>
                    <div className="col-span-4 font-semibold text-text-primary truncate">
                      {attr.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 原始脱敏 JSON 载荷 */}
          {activeTab === "json" && (
            <div className="rounded-xl border border-separator-border/80 bg-background-secondary-default/50 p-4 font-mono text-[11.5px] leading-relaxed text-text-primary shadow-inner">
              <pre className="whitespace-pre-wrap max-h-[55vh] overflow-auto select-all">
                {rawJson}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
