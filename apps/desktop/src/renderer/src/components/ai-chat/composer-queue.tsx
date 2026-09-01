/**
 * Composer 附件浮动托盘 (Floating Attachment Shelf)
 * 采用输入框顶部层叠卡片设计（参考图 2 优雅探出式布局），支持多图缩略图、文件类型胶囊、Lightbox 放大与一键清空。
 */
import { useEffect, useState } from "react"
import {
  RiAttachmentLine,
  RiCloseLine,
  RiDeleteBin7Line,
  RiExpandDiagonalLine,
  RiFileCodeLine,
  RiFileLine,
  RiFileTextLine,
  RiImageLine
} from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { cx } from "@/utils/cx"
import {
  clearComposerAssets,
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

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["ts", "tsx", "js", "jsx", "json", "py", "rs", "go", "html", "css"].includes(ext)) {
    return RiFileCodeLine
  }
  if (["md", "txt", "log", "doc", "docx", "pdf"].includes(ext)) {
    return RiFileTextLine
  }
  return RiFileLine
}

export function ComposerQueue({ className }: { className?: string }) {
  const [items, setItems] = useState<QueuedComposerAsset[]>(() => listComposerAssets())
  const [activePreview, setActivePreview] = useState<{
    src: string
    name: string
    size?: number
    mediaType?: string
  } | null>(null)

  useEffect(() => subscribeComposerAssets(setItems), [])

  if (items.length === 0) return null

  return (
    <>
      {/* 顶部探出式层叠附件托盘 (Layered Shelf) */}
      <div
        className={cx(
          "relative z-0 mx-auto flex w-[93%] sm:w-[95%] items-center justify-between gap-3",
          "-mb-3.5 rounded-t-2xl border-x border-t border-border-button-default/80",
          "bg-background-secondary-default/90 px-3.5 pt-2 pb-4 shadow-2xs backdrop-blur-md",
          "animate-in fade-in-50 slide-in-from-bottom-2 duration-200 select-none",
          className
        )}
      >
        {/* 左侧：附件横向滚动列表 */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {items.map((item) =>
            isImageMediaType(resolveMediaType(item.name, item.mediaType)) ? (
              <ImageAttachmentItem
                key={item.id}
                item={item}
                onOpenPreview={(src) =>
                  setActivePreview({
                    src,
                    name: item.name,
                    size: item.size,
                    mediaType: item.mediaType
                  })
                }
              />
            ) : (
              <FileAttachmentItem key={item.id} item={item} />
            )
          )}
        </div>

        {/* 右侧：汇总指示与一键清空 */}
        <div className="flex shrink-0 items-center gap-2 border-l border-border-button-default/60 pl-2.5 text-caption-2-medium text-text-tertiary">
          <div className="inline-flex items-center gap-1 font-medium text-text-secondary">
            <RiAttachmentLine className="size-3 text-accent-500" aria-hidden />
            <span>{items.length} 个附件</span>
          </div>
          <button
            type="button"
            onClick={clearComposerAssets}
            title="清空全部附件"
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-tertiary-default hover:text-text-error-primary"
          >
            <RiDeleteBin7Line className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Lightbox 模态大图预览 */}
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
                <DialogTitle
                  className="truncate text-title-3-semibold text-text-primary pr-8"
                  title={activePreview.name}
                >
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
      className="group relative flex size-12 shrink-0 items-center justify-center rounded-xl border border-border-button-default/70 bg-background-primary-default shadow-2xs transition-all hover:border-accent-500/50"
    >
      <button
        type="button"
        title={`点击查看大图：${item.name}`}
        onClick={() => src && onOpenPreview(src)}
        className="size-full overflow-hidden rounded-[10px] focus:outline-none cursor-pointer"
      >
        {src ? (
          <img
            src={src}
            alt={item.name}
            className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <RiImageLine className="size-5 text-foreground-icon-secondary" />
          </div>
        )}
      </button>

      {/* 悬停微缩放大按钮遮罩 */}
      {src ? (
        <div
          onClick={() => onOpenPreview(src)}
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[10px] bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
        >
          <RiExpandDiagonalLine className="size-3.5 text-white/90" />
        </div>
      ) : null}

      {/* 移除按钮 */}
      <button
        type="button"
        aria-label={`移除 ${item.name}`}
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
  const FileIcon = getFileIcon(item.name)

  return (
    <div
      data-testid="composer-asset-chip"
      className={cx(
        "group inline-flex items-center gap-1.5 rounded-xl border border-border-button-default/70",
        "bg-background-primary-default px-2.5 py-1.5 text-caption-1-medium text-text-secondary",
        "shadow-2xs transition-all hover:border-border-button-hover hover:text-text-primary"
      )}
    >
      <FileIcon className="size-3.5 text-accent-500 shrink-0" />
      <span className="max-w-[120px] truncate font-medium text-text-primary" title={item.name}>
        {item.name}
      </span>
      {sizeLabel ? (
        <span className="text-caption-2-medium text-text-tertiary shrink-0">
          ({sizeLabel})
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`移除 ${item.name}`}
        onClick={() => removeComposerAsset(item.id)}
        className="ml-0.5 flex size-3.5 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
      >
        <RiCloseLine className="size-3" />
      </button>
    </div>
  )
}
