/**
 * I1 反馈：芯片旁「已切换」+ 可选短浮层「已切换到 {model}」；
 * 跑着副句「下一轮才用新模型」。禁止 Composer 上方常驻微条。
 */
import { useSyncExternalStore } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { shortSessionId } from "@renderer/lib/model-switch-state"
import {
  modelSwitchBadgeVisible,
  modelSwitchNextTurnVisible,
  modelSwitchNoticeLabel,
  subscribeModelSwitchNotice
} from "./model-switch-notice"

export function ModelSwitchNotice() {
  const label = useSyncExternalStore(subscribeModelSwitchNotice, modelSwitchNoticeLabel, modelSwitchNoticeLabel)
  if (!label) return null
  return <ModelSwitchToast modelLabel={label} />
}

export function ModelSwitchToast({ modelLabel }: { modelLabel: string }) {
  const t = useT()
  if (!modelLabel.trim()) return null
  return (
    <div
      role="status"
      data-testid="model-switch-toast"
      className="pointer-events-none absolute bottom-[calc(100%+0.35rem)] right-0 z-20 inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-primary shadow-card"
    >
      <span className="size-1.5 rounded-full bg-state-success-text" />
      <span className="font-medium">{t("chat.modelSwitch.toast", { model: modelLabel })}</span>
    </div>
  )
}

export function ModelSwitchChipBadge({ nextTurn }: { nextTurn?: boolean }) {
  const t = useT()
  const show = useSyncExternalStore(subscribeModelSwitchNotice, modelSwitchBadgeVisible, modelSwitchBadgeVisible)
  const showNext = useSyncExternalStore(
    subscribeModelSwitchNotice,
    modelSwitchNextTurnVisible,
    modelSwitchNextTurnVisible
  )
  if (!show && !nextTurn && !showNext) return null
  return (
    <span className="inline-flex min-w-0 flex-col items-start gap-0.5" data-testid="model-switch-badge-cluster">
      {show ? (
        <span
          data-testid="model-switch-badge"
          className="rounded-full bg-state-success-text/10 px-1.5 py-px text-caption-2-medium text-state-success-text ring-1 ring-state-success-text/20"
        >
          {t("chat.modelSwitch.badge")}
        </span>
      ) : null}
      {showNext || nextTurn ? (
        <span data-testid="model-switch-next-turn" className="text-caption-2-regular text-text-tertiary">
          {t("chat.modelSwitch.nextTurn")}
        </span>
      ) : null}
    </span>
  )
}

export function ModelSwitchFootnote({
  kind,
  sessionId,
  switched
}: {
  kind: "unsupported" | "needs_login" | "empty" | "ready"
  sessionId: string | null
  switched: boolean
}) {
  const t = useT()
  if (kind === "unsupported") {
    return (
      <div className="px-3 pb-1">
        <p className="text-caption-2-medium text-status-yellow-text">{t("chat.modelSwitch.unsupported")}</p>
        <p className="text-caption-2-regular text-text-tertiary">{t("chat.modelSwitch.unsupportedHint")}</p>
      </div>
    )
  }
  if (!switched) return null
  const short = shortSessionId(sessionId)
  const line =
    switched && short
      ? t("chat.modelSwitch.footnoteSession", { sessionId: short })
      : t("chat.modelSwitch.footnote")
  return (
    <p
      className={cx("px-3 pb-1 text-caption-2-regular text-text-tertiary")}
      data-testid="model-switch-footnote"
    >
      {line}
    </p>
  )
}
