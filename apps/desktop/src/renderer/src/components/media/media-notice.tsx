/**
 * 导入 / 导出 / 生成的页面通知条。
 */
import { RiInformationLine, RiUploadCloud2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function MediaNotice({
  note,
  warning,
  onDismiss
}: {
  note: string
  warning: boolean
  onDismiss: () => void
}) {
  const t = useT()
  return (
    <div
      className={cx(
        "flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-caption-2-medium shadow-2xs",
        warning
          ? "border-state-warning-text/30 bg-state-warning-text/10 text-state-warning-text"
          : "border-border-button-default bg-background-secondary-default text-text-secondary"
      )}
    >
      <RiInformationLine className="size-3.5 shrink-0" />
      <span className="flex-1">{note}</span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={onDismiss}
        className="text-caption-2-semibold text-text-tertiary hover:text-text-primary"
      >
        {t("pages.media.dismiss")}
      </Button>
    </div>
  )
}

export function MediaDropOverlay() {
  const t = useT()
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent-500 bg-accent-500/[0.08]">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-500 shadow-sm">
        <RiUploadCloud2Line className="size-7" />
      </div>
      <p className="mt-3 text-body-semibold text-text-primary">{t("pages.media.dropToImport")}</p>
      <p className="mt-1 text-caption-1-medium text-text-secondary">
        {t("pages.media.dropHint")}
      </p>
    </div>
  )
}
