/**
 * 改动条右侧动作：Undo All / Keep All / Review，对标 Cursor 单行药丸组。
 * 没有 session checkpoint：撤销/保留都打开审查栏，不假装回滚磁盘。
 */
import { useT } from "@renderer/i18n"

export function SessionReviewActions({ onOpenReview }: { onOpenReview: () => void }) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <GhostAction label={t("chat.sessionReviewUndoAll")} title={t("chat.sessionReviewUndoHint")} onClick={onOpenReview} />
      <GhostAction label={t("chat.sessionReviewKeepAll")} title={t("chat.sessionReviewKeepHint")} onClick={onOpenReview} />
      <button
        type="button"
        title={t("chat.sessionReviewOpen")}
        onClick={onOpenReview}
        className="ml-1 flex h-6 cursor-pointer items-center rounded-md bg-background-tertiary-default px-2.5 text-[11px] font-medium text-text-primary transition-colors hover:bg-background-secondary-hover"
      >
        {t("chat.sessionReviewOpen")}
      </button>
    </div>
  )
}

function GhostAction({
  label,
  title,
  onClick
}: {
  label: string
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="h-6 cursor-pointer rounded-md px-2 text-[11px] text-text-tertiary transition-colors hover:bg-background-primary-default/60 hover:text-text-primary"
    >
      {label}
    </button>
  )
}
