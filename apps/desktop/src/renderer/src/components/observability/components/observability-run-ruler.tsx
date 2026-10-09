/**
 * 单次 run 时间尺：仅用指标里有的 send / TTFO / done，不画没有数据的 tool/approval。
 */
import { useT } from "@renderer/i18n"

export function ObservabilityRunRuler({
  duration,
  ttfo
}: {
  duration: number
  ttfo: number
}) {
  const t = useT()
  const ttfoRatio = duration > 0 ? (ttfo / duration) * 100 : 0
  const restRatio = Math.max(0, 100 - ttfoRatio)
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-button-default/80 bg-background-secondary-default/40 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-1 font-mono text-caption-2-medium text-text-secondary">
        <span>{t("pages.observability.timelineSend")}</span>
        <span>
          {t("pages.observability.timelineTtfo")} ({ttfo > 0 ? `${ttfo}ms` : "—"})
        </span>
        <span>
          {t("pages.observability.timelineDone")} ({duration}ms)
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-border-button-default/60">
        <div
          style={{ width: `${Math.max(ttfo > 0 ? 8 : 0, Math.min(92, ttfoRatio))}%` }}
          className="h-full bg-status-yellow-background/80"
        />
        <div
          style={{ width: `${Math.max(8, Math.min(92, restRatio))}%` }}
          className="h-full bg-accent-500/80"
        />
      </div>
    </div>
  )
}
