/**
 * 打开成功后贴在完成条右上角，短句，不进空态。
 */
import { useT } from "@renderer/i18n"

export function SessionPreviewToast({ visible }: { visible: boolean }) {
  const t = useT()
  if (!visible) return null
  return (
    <div
      role="status"
      className="absolute -top-3 right-4 z-10 flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-primary shadow-card"
    >
      <span className="size-1.5 rounded-full bg-state-success-text" />
      {t("chat.sessionReviewOpenPreviewDone")}
    </div>
  )
}
