/**
 * 完成条次级「在浏览器打开」。不可开时禁用 + tooltip，不藏钮。
 * 探索态不在这里判只读。
 */
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"

export function SessionPreviewOpenButton({
  enabled,
  busy,
  onOpen
}: {
  enabled: boolean
  busy?: boolean
  onOpen: () => void
}) {
  const t = useT()
  const locked = Boolean(busy) || !enabled
  return (
    <span className="relative ml-1">
      <button
        type="button"
        title={enabled ? t("chat.sessionReviewOpenPreview") : t("chat.sessionReviewOpenPreviewHint")}
        disabled={locked}
        onClick={onOpen}
        className={cx(
          "h-6 rounded-md border border-border-button-default px-2.5 text-caption-2-medium transition-colors",
          locked
            ? "cursor-not-allowed text-text-tertiary opacity-50"
            : "cursor-pointer text-text-primary hover:bg-background-primary-default/60"
        )}
      >
        {t("chat.sessionReviewOpenPreview")}
      </button>
    </span>
  )
}
