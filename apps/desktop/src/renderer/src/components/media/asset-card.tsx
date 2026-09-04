/**
 * 资产卡片：16:10 缩略图、来源胶囊、悬浮导出/上传/删除。
 */
import {
  RiChat1Line,
  RiDeleteBinLine,
  RiFileLine,
  RiFileMusicLine,
  RiFileTextLine,
  RiFileVideoLine,
  RiFolderUploadLine,
  RiImageLine,
  RiUpload2Line
} from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { queueComposerAsset } from "@renderer/hooks/composer-assets"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { isImageMediaType } from "@enjoy-agents/assets/media-type"
import type { AssetKind, AssetRecord } from "@enjoy-agents/ipc-contract"
import { useAssetSrc } from "@renderer/hooks/use-asset-src"
import { useT } from "@renderer/i18n"
import { fileExtensionLabel, formatBytes } from "./asset-format"

export function AssetCard({
  asset,
  isSelected,
  onSelect,
  onExport,
  onUpload,
  onDelete
}: {
  asset: AssetRecord
  isSelected: boolean
  onSelect: () => void
  onExport: (asset: AssetRecord) => void
  onUpload: (assetId: string) => void
  onDelete: (assetId: string) => void
}) {
  return (
    <article
      className={cx(
        "group relative flex flex-col overflow-hidden rounded-2xl border shadow-2xs transition-all duration-250 ease-out hover:-translate-y-1 hover:shadow-md",
        isSelected
          ? "border-accent-500 bg-accent-500/[0.03] ring-2 ring-accent-500/25"
          : "border-border-button-default bg-background-primary-default hover:border-accent-500/50"
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className="flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <AssetCardPreview asset={asset} />
        <AssetCardMeta asset={asset} />
      </button>
      <AssetCardActions
        asset={asset}
        visible={isSelected}
        onExport={() => onExport(asset)}
        onUpload={() => onUpload(asset.id)}
        onDelete={() => onDelete(asset.id)}
      />
    </article>
  )
}

function AssetCardPreview({ asset }: { asset: AssetRecord }) {
  const isImage = isImageMediaType(asset.mediaType)
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-background-secondary-default/70 flex items-center justify-center">
      {isImage ? (
        <AssetImageThumb assetId={asset.id} mediaType={asset.mediaType} />
      ) : (
        <AssetKindFallback kind={asset.kind} mediaType={asset.mediaType} name={asset.name} />
      )}
      <AssetSourceBadge source={asset.source} />
    </div>
  )
}

function AssetCardMeta({ asset }: { asset: AssetRecord }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-0.5 p-2.5">
      <h4 title={asset.name} className="truncate text-caption-1-semibold text-text-primary">
        {asset.name}
      </h4>
      <div className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
        <span className="font-mono">{formatBytes(asset.size, t)}</span>
        <span className="uppercase">{fileExtensionLabel(asset.name, asset.mediaType, t)}</span>
      </div>
    </div>
  )
}

function AssetTypeIcon({ kind, mediaType, className }: { kind: AssetKind; mediaType: string; className?: string }) {
  const iconClass = className ?? "size-6"
  if (kind === "image") return <RiImageLine className={cx(iconClass, "text-accent-500")} />
  if (kind === "audio") return <RiFileMusicLine className={cx(iconClass, "text-foreground-icon-secondary")} />
  if (kind === "video") return <RiFileVideoLine className={cx(iconClass, "text-foreground-icon-primary")} />
  if (mediaType.includes("markdown") || mediaType.includes("text")) {
    return <RiFileTextLine className={cx(iconClass, "text-foreground-icon-secondary")} />
  }
  return <RiFileLine className={cx(iconClass, "text-foreground-icon-tertiary")} />
}

function AssetImageThumb({ assetId, mediaType }: { assetId: string; mediaType: string }) {
  const src = useAssetSrc(assetId, mediaType)
  if (!src) return <div className="size-full animate-pulse bg-background-tertiary-default/40" />
  return <img src={src} alt="" className="size-full object-cover" loading="lazy" />
}

function AssetKindFallback({ kind, mediaType, name }: { kind: AssetKind; mediaType: string; name: string }) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-background-tertiary-default shadow-2xs">
        <AssetTypeIcon kind={kind} mediaType={mediaType} />
      </div>
      <span className="font-mono text-caption-2-semibold uppercase text-text-tertiary">
        {fileExtensionLabel(name, mediaType, t)}
      </span>
    </div>
  )
}

function AssetSourceBadge({ source }: { source: AssetRecord["source"] }) {
  const t = useT()
  const generated = source === "generated"
  return (
    <span
      className={cx(
        "absolute top-2 right-2 rounded-full border px-2 py-0.5 text-caption-2-semibold uppercase",
        generated
          ? "border-accent-500/20 bg-accent-500/15 text-accent-600"
          : "border-border-button-default/50 bg-background-primary-default/85 text-text-tertiary"
      )}
    >
      {generated ? t("pages.media.aiBadge") : source}
    </span>
  )
}

function AssetCardActions({
  asset,
  visible,
  onExport,
  onUpload,
  onDelete
}: {
  asset: AssetRecord
  visible: boolean
  onExport: () => void
  onUpload: () => void
  onDelete: () => void
}) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <div
      className={cx(
        "pointer-events-none absolute inset-x-0 top-0 flex aspect-[16/10] items-end justify-end p-2 transition-opacity",
        visible ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
      )}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-lg bg-background-full/80 p-1">
        <Button
          size="icon-sm"
          variant="ghost"
          title={t("pages.media.attachToChat")}
          className="size-7 rounded-lg bg-background-primary-default/90 text-accent-500 shadow-xs hover:bg-background-primary-default"
          onClick={() => {
            queueComposerAsset({
              id: asset.id,
              name: asset.name,
              mediaType: asset.mediaType,
              size: asset.size
            })
            void navigate({ to: "/" })
          }}
        >
          <RiChat1Line className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title={t("pages.media.exportToWorkspace")}
          className="size-7 rounded-lg bg-background-primary-default/90 text-text-primary shadow-xs hover:bg-background-primary-default"
          onClick={onExport}
        >
          <RiFolderUploadLine className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title={t("pages.media.uploadAsProvider")}
          className="size-7 rounded-lg bg-background-primary-default/90 text-text-primary shadow-xs hover:bg-background-primary-default"
          onClick={onUpload}
        >
          <RiUpload2Line className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title={t("pages.media.deleteAsset")}
          className="size-7 rounded-lg bg-background-primary-default/90 text-text-tertiary shadow-xs hover:bg-background-secondary-hover hover:text-text-error-primary"
          onClick={onDelete}
        >
          <RiDeleteBinLine className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
