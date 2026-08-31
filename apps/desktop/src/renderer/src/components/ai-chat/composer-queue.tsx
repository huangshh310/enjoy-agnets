/**
 * Composer 附件托盘 (Attachment Shelf)：静默紧凑、支持多文件横排、点击大图 Lightbox 预览与便捷删除。
 */
import { useEffect, useState } from "react"
import { RiCloseLine, RiExpandDiagonalLine, RiFileLine, RiImageLine } from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { cx } from "@/utils/cx"
import {
  listComposerAssets,
  removeComposerAsset,
  subscribeComposerAssets,
  type QueuedComposerAsset
} from "@renderer/hooks/composer-assets"
import { isImageMediaType, resolveMediaType } from "@enjoy-agents/assets/media-type"
import { getIde, hasIde } from "@renderer/lib/ide"

function formatFileSize(bytes?: number): string {
  if (bytes == null || bytes === 0) return ""
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function isImageAsset(item: QueuedComposerAsset): boolean {
  return isImageMediaType(resolveMediaType(item.name, item.mediaType))
}

export function ComposerQueue() {
  const [items, setItems] = useState<QueuedComposerAsset[]>(() => listComposerAssets())
  const [activePreview, setActivePreview] = useState<{ src: string; name: string; size?: number; mediaType?: string } | null>(null)

  useEffect(() => subscribeComposerAssets(setItems), [])

  if (items.length === 0) return null

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto px-3.5 pt-1.5 pb-1 no-scrollbar">
        {items.map((item) =>
          isImageAsset(item) ? (
            <ImageAttachmentItem
              key={item.id}
              item={item}
              onOpenPreview={(src) => setActivePreview({ src, name: item.name, size: item.size, mediaType: item.mediaType })}
            />
          ) : (
            <FileAttachmentItem key={item.id} item={item} />
          )
        )}
      </div>

      {/* 应用级全局图片预览模态弹框 (基于 Portal 挂载到根节点，无黑边纯净设计) */}
      <Dialog
        open={Boolean(activePreview)}
        onOpenChange={(open) => {
          if (!open) setActivePreview(null)
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-3xl overflow-hidden p-0 border-none bg-background-primary-default shadow-2xl rounded-3xl"
        >
          {activePreview ? (
            <div>
              <DialogHeader className="px-6 pt-5 pb-3 text-left">
                <DialogTitle className="truncate text-title-3-semibold text-text-primary pr-8" title={activePreview.name}>
                  {activePreview.name}
                </DialogTitle>
                <p className="text-caption-1-medium text-text-tertiary">
                  {activePreview.mediaType || "image"}
                  {activePreview.size ? ` · ${formatFileSize(activePreview.size)}` : ""}
                </p>
              </DialogHeader>

              <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-background-secondary-default/30 p-4">
                <img
                  src={activePreview.src}
                  alt={activePreview.name}
                  className="max-h-[60vh] max-w-full rounded-xl object-contain"
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ImageAttachmentItem({
  item,
  onOpenPreview
}: {
  item: QueuedComposerAsset
  onOpenPreview: (src: string) => void
}) {
  const [src, setSrc] = useState<string | null>(item.url ?? null)

  useEffect(() => {
    if (src) return
    if (!hasIde()) return
    let active = true
    void getIde()
      .assets.read(item.id)
      .then((row) => {
        const rec = row as { bytesBase64?: string; mediaType?: string }
        if (!active || !rec.bytesBase64) return
        setSrc(`data:${rec.mediaType ?? item.mediaType ?? "image/png"};base64,${rec.bytesBase64}`)
      })
    return () => {
      active = false
    }
  }, [item.id, item.mediaType, src])

  return (
    <div
      data-testid="composer-asset-chip"
      className="group relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border-button-default/70 bg-background-secondary-default/60 shadow-2xs transition-all hover:border-accent-500/50"
    >
      <button
        type="button"
        title={`Click to preview ${item.name}`}
        onClick={() => src && onOpenPreview(src)}
        className="size-full overflow-hidden rounded-[10px] focus:outline-none"
      >
        {src ? (
          <img
            src={src}
            alt={item.name}
            className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <RiImageLine className="size-4.5 text-foreground-icon-secondary" />
          </div>
        )}
      </button>

      {/* 悬停微缩放大按钮遮罩提示 */}
      {src ? (
        <div
          onClick={() => onOpenPreview(src)}
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[10px] bg-black/25 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <RiExpandDiagonalLine className="size-3.5 text-white/90" />
        </div>
      ) : null}

      {/* 移除按钮 */}
      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        onClick={(event) => {
          event.stopPropagation()
          removeComposerAsset(item.id)
        }}
        className="absolute -right-1 -top-1 z-10 flex size-4.5 cursor-pointer items-center justify-center rounded-full border border-border-button-default/80 bg-background-primary-default text-text-secondary opacity-0 shadow-2xs transition-all hover:scale-110 hover:text-text-primary group-hover:opacity-100"
      >
        <RiCloseLine className="size-3" />
      </button>
    </div>
  )
}

function FileAttachmentItem({ item }: { item: QueuedComposerAsset }) {
  const sizeLabel = formatFileSize(item.size)

  return (
    <div
      data-testid="composer-asset-chip"
      className={cx(
        "group inline-flex items-center gap-1.5 rounded-full border border-border-button-default/70",
        "bg-background-secondary-default/60 px-2.5 py-1 text-caption-1-medium text-text-secondary",
        "shadow-2xs transition-colors hover:border-border-button-hover hover:text-text-primary"
      )}
    >
      <RiFileLine className="size-3.5 text-foreground-icon-secondary shrink-0" />
      <span className="max-w-[130px] truncate" title={item.name}>
        {item.name}
      </span>
      {sizeLabel ? (
        <span className="text-caption-2-medium text-text-tertiary shrink-0">
          ({sizeLabel})
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        onClick={() => removeComposerAsset(item.id)}
        className="ml-0.5 flex size-3.5 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-background-tertiary-default hover:text-text-primary"
      >
        <RiCloseLine className="size-3" />
      </button>
    </div>
  )
}
