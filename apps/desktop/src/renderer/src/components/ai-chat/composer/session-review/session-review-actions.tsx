/**
 * 改动条右侧：全部撤销 / 全部保留 / 审查。
 */
import { useT } from "@renderer/i18n"

export function SessionReviewActions({
  busy,
  onUndo,
  onKeep,
  onOpenReview
}: {
  busy?: boolean
  onUndo: () => void
  onKeep: () => void
  onOpenReview: () => void
}) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <GhostAction
        label={t("chat.sessionReviewUndoAll")}
        title={t("chat.sessionReviewUndoHint")}
        disabled={busy}
        onClick={onUndo}
      />
      <GhostAction
        label={t("chat.sessionReviewKeepAll")}
        title={t("chat.sessionReviewKeepHint")}
        disabled={busy}
        onClick={onKeep}
      />
      <button
        type="button"
        title={t("chat.sessionReviewOpen")}
        disabled={busy}
        onClick={onOpenReview}
        className="ml-1 flex h-6 cursor-pointer items-center rounded-md bg-background-tertiary-default px-2.5 text-[11px] font-medium text-text-primary transition-colors hover:bg-background-secondary-hover disabled:cursor-not-allowed disabled:opacity-50"
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
      className="h-6 cursor-pointer rounded-md px-2 text-[11px] text-text-tertiary transition-colors hover:bg-background-primary-default/60 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  )
}
