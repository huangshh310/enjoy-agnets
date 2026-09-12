/**
 * 无改动条时的轻量完成条：本机 URL / 选中 html + 次级打开钮。
 */
import { useT } from "@renderer/i18n"
import { SessionPreviewOpenButton } from "./session-preview-open-button"
import { previewTargetLabel } from "./pick-preview-target"
import type { PreviewTarget } from "./preview-open.types"

export function SessionPreviewStrip({
  target,
  busy,
  onOpen
}: {
  target: PreviewTarget
  busy?: boolean
  onOpen: () => void
}) {
  const t = useT()
  return (
    <div
      data-session-preview
      data-frost="tile"
      className="relative flex h-7 min-w-0 items-center justify-between gap-3 rounded-xl border border-border-button-default bg-background-secondary-default/95 px-3 shadow-2xs backdrop-blur-md"
    >
      <span
        title={t("chat.sessionReviewOpenPreview")}
        className="truncate font-mono text-caption-1-medium tracking-tight text-text-primary/90"
      >
        {previewTargetLabel(target)}
      </span>
      <SessionPreviewOpenButton enabled busy={busy} onOpen={onOpen} />
    </div>
  )
}
