/**
 * 资产与媒体工作室顶栏：标题、资产统计、快速上传。
 */
import { RiImageLine, RiUpload2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function MediaPageHeader({
  totalAssets,
  onUploadClick
}: {
  totalAssets: number
  onUploadClick: () => void
}) {
  const t = useT()
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
          <RiImageLine className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 data-testid="page-media" className="text-title-3-semibold text-text-primary">
              {t("pages.media.title")}
            </h1>
            <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 font-mono text-caption-2-medium text-text-tertiary">
              {t(totalAssets === 1 ? "pages.media.assetOne" : "pages.media.assetMany", { n: totalAssets })}
            </span>
          </div>
          <p className="text-caption-1-medium text-text-secondary">
            {t("pages.media.subtitle")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="hidden text-caption-2-regular text-text-tertiary sm:inline-block">
          {t("pages.media.uploadLimitHint")}
        </span>
        <Button size="sm" variant="outline" onClick={onUploadClick} className="gap-1.5 shadow-xs">
          <RiUpload2Line className="size-4 text-text-tertiary" />
          <span>{t("pages.media.upload")}</span>
        </Button>
      </div>
    </header>
  )
}
