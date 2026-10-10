/**
 * 改动条右侧：全部撤销 / 全部保留 / 在浏览器打开 / 审查。
 */
import { useT } from "@renderer/i18n"
import { SessionPreviewOpenButton } from "./preview-open/session-preview-open-button"
import type { SessionReviewActionsProps } from "./session-review.types"

export function SessionReviewActions({
  busy,
  hasFiles = true,
  canOpenPreview = false,
  previewBusy,
  onUndo,
  onKeep,
  onOpenReview,
  onOpenPreview
}: SessionReviewActionsProps) {
  const t = useT()
  const locked = Boolean(busy) || !hasFiles
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <GhostAction
        label={t("chat.sessionReviewUndoAll")}
        title={t("chat.sessionReviewUndoHint")}
        disabled={locked}
        onClick={onUndo}
      />
      <GhostAction
        label={t("chat.sessionReviewKeepAll")}
        title={t("chat.sessionReviewKeepHint")}
        disabled={locked}
        onClick={onKeep}
      />
      <SessionPreviewOpenButton
        enabled={canOpenPreview}
        busy={previewBusy}
        onOpen={onOpenPreview}
      />
      <button
        type="button"
        data-testid="session-review-open"
        title={t("chat.sessionReviewOpen")}
        disabled={busy}
        onClick={onOpenReview}
        className="ml-1 flex h-6 cursor-pointer items-center rounded-md bg-accent-500 px-2.5 text-caption-2-medium text-text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("chat.sessionReviewOpen")}
      </button>
    </div>
  )
}

function GhostAction({
  label,
  title,
  disabled,
  onClick
}: {
  label: string
  title: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="h-6 cursor-pointer rounded-md px-2 text-caption-2-medium text-text-tertiary transition-colors hover:bg-background-primary-default/60 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  )
}
