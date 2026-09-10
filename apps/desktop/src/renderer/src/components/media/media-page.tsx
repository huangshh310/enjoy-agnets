/**
 * 资产与媒体工作室：分类、常驻工具栏、4 列网格。
 */
import { useRef } from "react"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { useT } from "@renderer/i18n"
import { AssetGrid } from "./asset-grid"
import { MediaDropOverlay, MediaNotice } from "./media-notice"
import { MediaPageHeader } from "./media-page-header"
import { getCategoryLabel, isAssetCategory } from "./media-page.types"
import { StudioGeneratorPanel } from "./studio-console"
import { useFileDrop } from "./use-file-drop"
import { useMediaLibrary } from "./use-media-library"

export function MediaPage() {
  const t = useT()
  const library = useMediaLibrary()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const drop = useFileDrop((files) => void library.io.importFiles(files))

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.media.filterPlaceholder")}
      groups={library.assets.groups}
      selectedId={library.assets.selectedCategory}
      onSelect={(id) => {
        if (isAssetCategory(id)) library.assets.setSelectedCategory(id)
      }}
      contentWidth="fill"
      hideChrome
      searchValue={library.assets.filterQuery}
      onSearchChange={library.assets.setFilterQuery}
      filterNav={false}
    >
      <div className="relative flex h-full min-h-0 flex-col gap-4 px-8 pt-5 pb-6" {...drop.dropHandlers}>
        {drop.isDragOver ? <MediaDropOverlay /> : null}
        <MediaLibraryBody library={library} onUploadClick={() => fileInputRef.current?.click()} />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          data-testid="media-file-input"
          className="hidden"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])]
            if (files.length > 0) void library.io.importFiles(files)
            event.target.value = ""
          }}
        />
        <MediaDeleteDialog library={library} />
      </div>
    </SecondaryPageShell>
  )
}

function MediaLibraryBody({
  library,
  onUploadClick
}: {
  library: ReturnType<typeof useMediaLibrary>
  onUploadClick: () => void
}) {
  const { assets, studio, io, notice, sessionId, modelId, capabilities, experimentalMedia } = library
  const t = useT()
  return (
    <>
      <MediaPageHeader totalAssets={assets.assets.length} onUploadClick={onUploadClick} />
      <StudioGeneratorPanel
        mode={studio.mode}
        onModeChange={studio.setMode}
        prompt={studio.prompt}
        onPromptChange={studio.setPrompt}
        modelId={modelId}
        sessionId={sessionId}
        capabilities={capabilities}
        isGenerating={studio.isGenerating}
        selectedAsset={assets.selectedAsset}
        selectedAudioAsset={assets.selectedAudioAsset}
        experimentalMedia={experimentalMedia}
        onGenerate={studio.runGeneration}
      />
      {notice.note ? (
        <MediaNotice note={notice.note} warning={io.overwriteArmed} onDismiss={() => notice.setNote(null)} />
      ) : null}
      <AssetGrid
        visibleAssets={assets.visibleAssets}
        categoryLabel={getCategoryLabel(t, assets.selectedCategory)}
        selectedAssetId={assets.selectedAssetId}
        exportPath={io.exportPath}
        onExportPathChange={io.setExportPath}
        onSelectAsset={assets.setSelectedAssetId}
        onExport={io.handleExport}
        onUpload={io.handleUpload}
        onDelete={assets.setPendingDeleteId}
      />
    </>
  )
}

function MediaDeleteDialog({ library }: { library: ReturnType<typeof useMediaLibrary> }) {
  const t = useT()
  const pending = library.assets.pendingDeleteAsset
  return (
    <ConfirmDialog
      open={Boolean(pending)}
      title={t("pages.media.deleteTitle")}
      description={pending ? t("pages.media.deleteConfirm", { name: pending.name }) : ""}
      confirmLabel={t("common.delete")}
      destructive
      onOpenChange={(open) => {
        if (!open) library.assets.setPendingDeleteId(null)
      }}
      onConfirm={() => void library.io.confirmDelete()}
    />
  )
}
