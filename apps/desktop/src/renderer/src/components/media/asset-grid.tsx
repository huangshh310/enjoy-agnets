/**
 * 资产网格：2~4 列卡片 + 分页。拖拽导入挂在页面壳，不在网格内。
 */
import { useEffect, useMemo, useState } from "react"
import { RiArrowLeftSLine, RiArrowRightSLine, RiFolderUploadLine, RiImageLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { AssetCard } from "./asset-card"
import { AssetGridPager } from "./asset-grid-pager"
import { PAGE_SIZE } from "./media-page.types"

type AssetGridProps = {
  visibleAssets: AssetRecord[]
  categoryLabel: string
  selectedAssetId: string | null
  exportPath: string
  onExportPathChange: (path: string) => void
  onSelectAsset: (id: string | null) => void
  onExport: (asset: AssetRecord) => void
  onUpload: (assetId: string) => void
  onDelete: (assetId: string) => void
}

export function AssetGrid({
  visibleAssets,
  categoryLabel,
  selectedAssetId,
  exportPath,
  onExportPathChange,
  onSelectAsset,
  onExport,
  onUpload,
  onDelete
}: AssetGridProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(visibleAssets.length / PAGE_SIZE))
  const safeCurrentPage = currentPage > totalPages ? 1 : currentPage

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [currentPage, totalPages])

  const pagedAssets = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return visibleAssets.slice(start, start + PAGE_SIZE)
  }, [visibleAssets, safeCurrentPage])

  return (
    <section className="relative flex flex-1 flex-col gap-3">
      <AssetGridHeader
        categoryLabel={categoryLabel}
        total={visibleAssets.length}
        exportPath={exportPath}
        onExportPathChange={onExportPathChange}
      />
      {visibleAssets.length === 0 ? (
        <AssetGridEmpty />
      ) : (
        <AssetGridBody
          assets={pagedAssets}
          selectedAssetId={selectedAssetId}
          safeCurrentPage={safeCurrentPage}
          totalPages={totalPages}
          total={visibleAssets.length}
          onSelectAsset={onSelectAsset}
          onExport={onExport}
          onUpload={onUpload}
          onDelete={onDelete}
          onPageChange={setCurrentPage}
        />
      )}
    </section>
  )
}

function AssetGridHeader({
  categoryLabel,
  total,
  exportPath,
  onExportPathChange
}: {
  categoryLabel: string
  total: number
  exportPath: string
  onExportPathChange: (path: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
      <div className="flex items-center gap-2">
        <h3 className="text-body-semibold text-text-primary">{categoryLabel}</h3>
        <span className="rounded-full bg-background-secondary-default px-2 py-0.5 font-mono text-caption-2-medium text-text-tertiary">
          {total}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
        <RiFolderUploadLine className="size-3.5" />
        <span>Export path:</span>
        <Input
          value={exportPath}
          onChange={(event) => onExportPathChange(event.target.value)}
          placeholder="assets/export.bin"
          className="h-7 w-36 font-mono text-caption-2-medium bg-background-secondary-default px-2"
        />
      </div>
    </div>
  )
}

function AssetGridEmpty() {
  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/40 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-background-tertiary-default text-text-tertiary">
        <RiImageLine className="size-6" />
      </div>
      <p className="mt-3 text-body-semibold text-text-primary">No assets found</p>
      <p className="mt-1 max-w-xs text-caption-1-medium text-text-secondary">
        Generate media using the studio toolbar above, or drag and drop files anywhere here.
      </p>
    </div>
  )
}

function AssetGridBody({
  assets,
  selectedAssetId,
  safeCurrentPage,
  totalPages,
  total,
  onSelectAsset,
  onExport,
  onUpload,
  onDelete,
  onPageChange
}: {
  assets: AssetRecord[]
  selectedAssetId: string | null
  safeCurrentPage: number
  totalPages: number
  total: number
  onSelectAsset: (id: string | null) => void
  onExport: (asset: AssetRecord) => void
  onUpload: (assetId: string) => void
  onDelete: (assetId: string) => void
  onPageChange: (page: number) => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            isSelected={selectedAssetId === asset.id}
            onSelect={() => onSelectAsset(selectedAssetId === asset.id ? null : asset.id)}
            onExport={onExport}
            onUpload={onUpload}
            onDelete={onDelete}
          />
        ))}
      </div>
      <AssetGridFooter
        safeCurrentPage={safeCurrentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={onPageChange}
      />
    </>
  )
}

function AssetGridFooter({
  safeCurrentPage,
  totalPages,
  total,
  onPageChange
}: {
  safeCurrentPage: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) {
    return (
      <div className="pt-2">
        <span className="text-caption-2-medium text-text-tertiary">
          {total} {total === 1 ? "asset" : "assets"} total
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between pt-2 border-t border-separator-border/40">
      <span className="text-caption-2-medium text-text-tertiary">
        Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="outline"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          className="size-7"
          aria-label="Previous page"
        >
          <RiArrowLeftSLine className="size-3.5" />
        </Button>
        <AssetGridPager currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={onPageChange} />
        <Button
          size="icon-sm"
          variant="outline"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          className="size-7"
          aria-label="Next page"
        >
          <RiArrowRightSLine className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
