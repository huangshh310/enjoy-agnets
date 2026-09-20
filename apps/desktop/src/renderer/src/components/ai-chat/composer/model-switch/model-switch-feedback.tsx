/**
 * I1 反馈：成功微条「已切换到 {model}」、脚注「同一助手，不换引擎」。
 * 成功句不写换引擎或交接。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { shortSessionId } from "@renderer/lib/model-switch-state"

export function ModelSwitchToast({ modelLabel }: { modelLabel: string }) {
  const t = useT()
  if (!modelLabel.trim()) return null
  return (
    <div
      role="status"
      data-testid="model-switch-toast"
      className="absolute -top-1 right-0 z-10 inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-primary shadow-card"
    >
      <span className="size-1.5 rounded-full bg-state-success-text" />
      <span className="font-medium">{t("chat.modelSwitch.toast", { model: modelLabel })}</span>
    </div>
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
        <p className="text-caption-2-medium text-text-warning-primary">{t("chat.modelSwitch.unsupported")}</p>
        <p className="text-caption-2-regular text-text-tertiary">{t("chat.modelSwitch.unsupportedHint")}</p>
      </div>
    )
  }
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
