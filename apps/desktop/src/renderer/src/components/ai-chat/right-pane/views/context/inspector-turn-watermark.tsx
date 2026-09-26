/**
 * 单轮耗时：有遥测或 thoughtSeconds 才画，缺值显示 —。
 */
import type { ReactNode } from "react"
import { RiSpeedUpLine, RiTimerLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { TurnPerformanceStats } from "./context-inspector.types"

export function InspectorTurnWatermark({ perf }: { perf: TurnPerformanceStats }) {
  const t = useT()
  const { durationMs, ttfoMs, tokensPerSecond, outputTokens, isLive } = perf
  const durationLabel =
    durationMs >= 1000 ? `${(durationMs / 1000).toFixed(2)}s` : durationMs > 0 ? `${durationMs}ms` : "—"

  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
          <RiTimerLine className="size-4 text-accent-500" />
          <span>{t("chat.inspectorTurnMetrics")}</span>
        </div>
        {isLive ? (
          <span className="inline-flex select-none items-center gap-1 font-mono text-caption-2-medium text-accent-500">
            <span className="size-1.5 animate-ping rounded-full bg-accent-500" />
            <span>{t("chat.inspectorStreaming")}</span>
          </span>
        ) : (
          <span className="font-mono text-caption-2-regular text-text-tertiary">{durationLabel}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-caption-2-medium">
        <Kpi label={t("chat.inspectorTtfo")} value={ttfoMs > 0 ? `${ttfoMs}ms` : "—"} />
        <Kpi
          label={t("chat.inspectorThroughput")}
          value={tokensPerSecond > 0 ? `${tokensPerSecond} t/s` : `${outputTokens} tok`}
          icon={<RiSpeedUpLine className="size-3 shrink-0 text-accent-500" />}
        />
      </div>

      {durationMs > 0 ? <TurnBar durationMs={durationMs} ttfoMs={ttfoMs} /> : null}
    </section>
  )
}

function Kpi({
  label,
  value,
  icon
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center justify-between rounded-lg border border-separator-border/50 bg-background-secondary-default/30 px-2.5 py-1.5">
      <span className="flex min-w-0 items-center gap-1 truncate text-text-secondary">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-semibold text-text-primary">{value}</span>
    </div>
  )
}

function TurnBar({ durationMs, ttfoMs }: { durationMs: number; ttfoMs: number }) {
  const t = useT()
  const ttfoRatio = ttfoMs > 0 ? Math.min(85, Math.max(1, (ttfoMs / durationMs) * 100)) : 0
  const streamRatio = Math.max(0, 100 - ttfoRatio)
  return (
    <div className="flex flex-col gap-1 pt-0.5">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-background-secondary-default">
        {ttfoRatio > 0 ? (
          <div style={{ width: `${ttfoRatio}%` }} className="h-full bg-status-yellow-background" />
        ) : null}
        <div style={{ width: `${streamRatio}%` }} className="h-full bg-accent-500" />
      </div>
      <div className="flex items-center justify-between font-mono text-caption-2-regular text-text-tertiary">
        <span>{t("chat.inspectorHandshake", { n: Math.round(ttfoRatio) })}</span>
        <span>{t("chat.inspectorStreamOut", { n: Math.round(streamRatio) })}</span>
      </div>
    </div>
  )
}
