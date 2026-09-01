/**
 * 资产与媒体工作室顶栏：标题、资产统计、快速上传。
 */
import { RiImageLine, RiUpload2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"

export function MediaPageHeader({
  totalAssets,
  onUploadClick
}: {
  totalAssets: number
  onUploadClick: () => void
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
          <RiImageLine className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 data-testid="page-media" className="text-title-3-semibold text-text-primary">
              Asset Studio
            </h1>
            <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 font-mono text-caption-2-medium text-text-tertiary">
              {totalAssets} {totalAssets === 1 ? "asset" : "assets"}
            </span>
          </div>
          <p className="text-caption-1-medium text-text-secondary">
            Manage multimodal assets, synthesize speech, generate images or export to workspace.
          </p>
        </div>
      </div>

      <Button size="sm" variant="outline" onClick={onUploadClick} className="gap-1.5 shadow-xs">
        <RiUpload2Line className="size-4 text-text-tertiary" />
        <span>Upload</span>
      </Button>
    </header>
  )
}
