/**
 * Composer 底栏的上下文环。没有窗口或用量时不占位。
 */
import { useState, useSyncExternalStore } from "react"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { contextWindowForModel } from "@renderer/lib/model-context-window"
import { sessionUsageFor, sessionUsageVersion, subscribeSessionUsage } from "@renderer/stores/session-usage"
import { useContextInspectorData } from "../right-pane/views/context/use-context-inspector-data"
import { compactSessionOrReport } from "../right-pane/views/context/compact-session/run-session-compact"
import { formatTokens } from "../agent-limits/format-tokens"
import { useT } from "@renderer/i18n"
import { contextRingRatio, contextRingTone, type ContextRingTone } from "./context-ring-math"

const TONE_CLASS: Record<ContextRingTone, string> = {
  tertiary: "text-text-tertiary",
  amber: "text-amber-500",
  red: "text-state-error-text"
}

export function ContextRing() {
  const model = useContextRingModel()
  const t = useT()
  const running = useChatStore((state) => state.running)
  const sessionId = useChatStore((state) => state.sessionId)
  const [busy, setBusy] = useState(false)
  if (!model) return null
  const label = model.source === "measured"
    ? t("chat.contextRingMeasured", { used: formatTokens(model.used), window: formatTokens(model.window) })
    : t("chat.contextRingEstimate", { used: formatTokens(model.used), window: formatTokens(model.window) })
  return (
    <button
      type="button"
      aria-label={t("chat.contextRingLabel")}
      title={label}
      disabled={running || busy}
      onClick={() => {
        setBusy(true)
        void compactSessionOrReport(sessionId).finally(() => setBusy(false))
      }}
      className={cx("flex size-7 shrink-0 items-center justify-center rounded-full disabled:opacity-40", TONE_CLASS[model.tone])}
    >
      <RingSvg ratio={model.ratio} />
    </button>
  )
}

function RingSvg({ ratio }: { ratio: number }) {
  const radius = 5
  const circumference = 2 * Math.PI * radius
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r={radius} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={`${circumference * ratio} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 7 7)"
      />
    </svg>
  )
}

function useContextRingModel(): { ratio: number; tone: ContextRingTone; used: number; window: number; source: "measured" | "estimate" } | null {
  const sessionId = useChatStore((state) => state.sessionId)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const modelId = useChatStore((state) => state.modelId)
  const models = useChatStore((state) => state.models)
  useSyncExternalStore(subscribeSessionUsage, sessionUsageVersion, sessionUsageVersion)
  const measured = sessionUsageFor(sessionId)
  const stats = useContextInspectorData(workspaceId).tokenStats
  const window = contextWindowForModel(models, modelId) ?? (stats.maxTokens > 0 ? stats.maxTokens : undefined)
  if (measured && window) {
    const ratio = contextRingRatio(measured.inputTokens, window)
    return ratio == null ? null : { ratio, tone: contextRingTone(ratio), used: measured.inputTokens, window, source: "measured" }
  }
  if (stats.usedTokens > 0 && window) {
    const ratio = contextRingRatio(stats.usedTokens, window)
    return ratio == null ? null : { ratio, tone: contextRingTone(ratio), used: stats.usedTokens, window, source: "estimate" }
  }
  return null
}
