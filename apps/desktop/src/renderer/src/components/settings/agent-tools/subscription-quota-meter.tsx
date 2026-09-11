/**
 * 有上限的额度行：标签 + pacing 注、胶囊条、已用/剩余 ⟷ 重置时刻。
 * 设置页里条永远画已用%（空条+已用尽会看反）。数字仍可切换剩余/已用。颜色只跟 pacing。
 */
import { useState } from "react"
import { RiFireFill } from "@remixicon/react"
import type { QuotaWindowItem } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { formatClock, formatRunOut } from "./format-spend"
import { meterFillClass, meterNoteClass } from "./meter-tone"

export function SubscriptionQuotaMeter({
  window,
  showLeft,
  onToggleLeft,
  showExactReset,
  onToggleExact
}: {
  window: QuotaWindowItem
  showLeft?: boolean
  onToggleLeft?: () => void
  showExactReset?: boolean
  onToggleExact?: () => void
}) {
  const t = useT()
  const [localLeft, setLocalLeft] = useState(true)
  const [localExact, setLocalExact] = useState(false)
  const leftMode = showLeft ?? localLeft
  const exactMode = showExactReset ?? localExact
  const used = Math.min(100, Math.max(0, window.usedPercent))
  const left = Math.max(0, 100 - used)
  const status = window.pacing?.status
  const tick = window.pacing?.evenPacePercent

  if (window.statusText) {
    return (
      <div className="flex items-baseline justify-between gap-3 py-1.5 text-caption-2-medium">
        <span className="text-caption-1-medium text-text-primary">{window.displayName || window.name}</span>
        <span className="tabular-nums text-text-tertiary">{window.statusText}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 py-1.5">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 truncate text-caption-1-medium text-text-primary">
          {window.displayName || window.name}
        </span>
        <PacingNote
          window={window}
          exact={exactMode}
          onToggleExact={onToggleExact ?? (() => setLocalExact((v) => !v))}
        />
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-background-secondary-hover">
        <div
          className={`h-full rounded-full ${meterFillClass(status)}`}
          style={{ width: `${used}%` }}
        />
        {tick != null && tick > 0 && tick < 100 ? (
          <span
            className="pointer-events-none absolute top-[-2px] h-[10px] w-0.5 rounded-full bg-text-primary/55"
            style={{ left: `calc(${tick}% - 1px)` }}
          />
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-3 text-caption-2-medium">
        <button
          type="button"
          className="text-text-primary tabular-nums"
          onClick={onToggleLeft ?? (() => setLocalLeft((v) => !v))}
        >
          {leftMode
            ? t("settings.subscriptions.percentLeft", { n: Math.round(left) })
            : t("settings.subscriptions.percentUsed", { n: Math.round(used) })}
        </button>
        <button
          type="button"
          className="text-text-tertiary tabular-nums"
          onClick={onToggleExact ?? (() => setLocalExact((v) => !v))}
        >
          {resetLabel(window, exactMode, t)}
        </button>
      </div>
    </div>
  )
}

function PacingNote({
  window,
  exact,
  onToggleExact
}: {
  window: QuotaWindowItem
  exact: boolean
  onToggleExact: () => void
}) {
  const t = useT()
  const status = window.pacing?.status
  const used = Math.min(100, Math.max(0, window.usedPercent))
  if (status === "exhausted" || used >= 100) {
    return (
      <span className={`ml-auto inline-flex items-center gap-1 ${meterNoteClass(status)}`}>
        <RiFireFill className="size-3" />
        {t("settings.subscriptions.limitReached")}
      </span>
    )
  }
  if (status === "danger") {
    const eta = window.pacing?.projectedRunOutAt
    const text = eta
      ? exact
        ? t("settings.subscriptions.limitAt", { time: formatClock(eta) })
        : t("settings.subscriptions.limitIn", { when: formatRunOut(eta) })
      : t("settings.subscriptions.limitReached")
    return (
      <button
        type="button"
        className={`ml-auto inline-flex items-center gap-1 ${meterNoteClass(status)}`}
        onClick={onToggleExact}
      >
        <RiFireFill className="size-3" />
        {text}
      </button>
    )
  }
  if (status === "warning") {
    const spare = Math.max(1, Math.round(window.pacing?.cushionPercent ?? 1))
    return <span className={`ml-auto ${meterNoteClass(status)}`}>{t("settings.subscriptions.spare", { n: spare })}</span>
  }
  return <span className="ml-auto" />
}

function resetLabel(
  window: QuotaWindowItem,
  exact: boolean,
  t: (key: string, values?: Record<string, string | number>) => string
): string {
  if (exact && window.resetAt) return t("settings.subscriptions.resetsAt", { time: formatClock(window.resetAt) })
  if (window.resetsIn) return t("settings.subscriptions.resetsIn", { when: window.resetsIn })
  return ""
}
