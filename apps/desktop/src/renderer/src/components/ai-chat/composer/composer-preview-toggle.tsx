/**
 * 底栏次要 ghost：预览 ⟷ 源码。位于 + 与模型芯片之间；零净增高。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function ComposerPreviewToggle({
  previewOpen,
  onToggle
}: {
  previewOpen: boolean
  onToggle: () => void
}) {
  const t = useT()
  const label = previewOpen ? t("chat.composerSource") : t("chat.composerPreview")
  const hint = t("chat.composerPreviewHint")
  return (
    <button
      type="button"
      data-testid="composer-preview-toggle"
      aria-pressed={previewOpen}
      aria-label={label}
      title={hint}
      onClick={onToggle}
      className={cx(
        "flex h-7 shrink-0 items-center rounded-full px-2 text-caption-2-medium transition-colors",
        "text-text-tertiary hover:bg-background-secondary-hover hover:text-text-secondary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        previewOpen && "text-text-secondary"
      )}
    >
      {label}
    </button>
  )
}
