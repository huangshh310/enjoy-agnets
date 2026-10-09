/**
 * Trace 概览：KPI、瀑布条、错误提示。时间尺只有 send/TTFO/done。
 */
import { RiBarChartHorizontalLine, RiInformationLine } from "@remixicon/react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getTraceErrorHint } from "./observability-trace-copy"
import { ObservabilityRunRuler } from "./observability-run-ruler"

export function ObservabilityTraceOverview({ metric }: { metric: TelemetryMetric }) {
  const t = useT()
  const duration = metric.durationMs ?? 0
  const ttfo = metric.ttfoMs ?? 0
  const streamDuration = Math.max(duration - ttfo, 0)
  const ttfoRatio = duration > 0 ? (ttfo / duration) * 100 : 0
  const streamRatio = duration > 0 ? (streamDuration / duration) * 100 : 0
  const inTok = metric.inputTokens ?? 0
  const outTok = metric.outputTokens ?? 0
  return (
    <div className="flex flex-col gap-4">
      <ObservabilityRunRuler duration={duration} ttfo={ttfo} />
      <div className="grid grid-cols-2 gap-3 font-mono sm:grid-cols-4">
        <Kpi
          label={t("pages.observability.totalDuration")}
          value={duration >= 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`}
          hint={t("pages.observability.e2eTime")}
        />
        <Kpi
          label={t("pages.observability.firstTokenTtfo")}
          value={ttfo > 0 ? `${ttfo}ms` : t("pages.observability.na")}
          hint={ttfo > 0 ? t("pages.observability.ofDuration", { n: ttfoRatio.toFixed(0) }) : t("pages.observability.nonStreaming")}
          accent
        />
        <Kpi
          label={t("pages.observability.tokenInOut")}
          value={`${inTok} / ${outTok}`}
          hint={t("pages.observability.totalTokens", { n: inTok + outTok })}
        />
        <Kpi
          label={t("pages.observability.genThroughput")}
          value={
            metric.tokensPerSecond
              ? t("pages.observability.tPerS", { n: metric.tokensPerSecond.toFixed(1) })
              : t("pages.observability.na")
          }
          hint={t("pages.observability.avgTokenRate")}
        />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-secondary-default/20 p-4.5">
        <div className="flex items-center justify-between text-caption-1-medium font-semibold text-text-primary">
          <div className="flex items-center gap-1.5">
            <RiBarChartHorizontalLine className="size-4 text-accent-500" />
            <span>{t("pages.observability.waterfallTitle")}</span>
          </div>
          <span className="font-mono text-caption-2-regular text-text-tertiary">
            {t("pages.observability.msTotal", { n: duration })}
          </span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-background-secondary-default shadow-inner">
          {ttfo > 0 ? <div style={{ width: `${ttfoRatio}%` }} className="h-full bg-status-yellow-background" /> : null}
          {streamDuration > 0 ? <div style={{ width: `${streamRatio}%` }} className="h-full bg-accent-500" /> : null}
        </div>
        <div className="mt-1 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <PhaseRow
            color="bg-status-yellow-background"
            label={t("pages.observability.phaseTtfo")}
            value={ttfo > 0 ? `${ttfo}ms (${ttfoRatio.toFixed(0)}%)` : "—"}
          />
          <PhaseRow
            color="bg-accent-500"
            label={t("pages.observability.phaseStream")}
            value={streamDuration > 0 ? `${streamDuration}ms (${streamRatio.toFixed(0)}%)` : "—"}
          />
        </div>
      </div>
      {metric.errorClass && metric.errorClass !== "ok" ? (
        <div className="flex flex-col gap-1.5 rounded-xl border border-border-error-default/25 bg-background-tertiary-error/5 p-4 text-caption-2-regular">
          <div className="flex items-center gap-1.5 font-bold text-text-error-primary">
            <RiInformationLine className="size-4 shrink-0" />
            <span>{t("pages.observability.errorClass", { errorClass: metric.errorClass })}</span>
          </div>
          <p className="leading-relaxed text-text-secondary">{getTraceErrorHint(metric.errorClass, t)}</p>
        </div>
      ) : null}
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  accent
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-3.5 shadow-2xs">
      <div className="text-caption-2-regular text-text-tertiary">{label}</div>
      <div className={`mt-1 text-title-3-semibold ${accent ? "text-status-yellow-text" : "text-text-primary"}`}>{value}</div>
      <div className="mt-0.5 text-caption-2-regular text-text-tertiary">{hint}</div>
    </div>
  )
}

function PhaseRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-separator-border/60 bg-background-primary-default p-3 shadow-2xs">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${color}`} />
        <span className="text-text-secondary">{label}</span>
      </div>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  )
}
