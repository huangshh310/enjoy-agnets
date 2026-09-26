/**
 * Composer 附件条目与 Lightbox 大图预览组件。
 */
import { useEffect, useState } from "react"
import {
  RiCloseLine,
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
  removeComposerAsset,
  type QueuedComposerAsset
} from "@renderer/hooks/composer-assets"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export function formatFileSize(bytes?: number): string {
  if (bytes == null || bytes === 0) return ""
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["ts", "tsx", "js", "jsx", "json", "py", "rs", "go", "html", "css", "sql", "sh"].includes(ext)) {
    return RiFileCodeLine
  }
  if (["md", "txt", "log", "doc", "docx", "pdf"].includes(ext)) {
    return RiFileTextLine
  }
  return RiFileLine
}

export function ImageAttachmentItem({
  item,
  onOpenPreview
}: {
  item: QueuedComposerAsset
  onOpenPreview: (src: string) => void
}) {
  const t = useT()
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
      className="group relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border-button-default/80 bg-background-primary-default shadow-2xs transition-all hover:border-accent-500/50"
    >
      <button
        type="button"
        title={t("chat.previewImage", { name: item.name })}
        onClick={() => src && onOpenPreview(src)}
        className="size-full overflow-hidden rounded-xl focus:outline-none cursor-pointer"
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

      {src ? (
        <div
          onClick={() => onOpenPreview(src)}
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
        >
          <RiExpandDiagonalLine className="size-3.5 text-white/90" />
        </div>
      ) : null}

      <button
        type="button"
        aria-label={t("chat.removeItem", { name: item.name })}
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

export function FileAttachmentItem({ item }: { item: QueuedComposerAsset }) {
  const t = useT()
  const sizeLabel = formatFileSize(item.size)
  const FileIcon = getFileIcon(item.name)

  return (
    <div
      data-testid="composer-asset-chip"
      className={cx(
        "group inline-flex h-10 items-center justify-between gap-1.5 rounded-xl border border-border-button-default/80",
        "bg-background-primary-default px-2.5 text-caption-2-medium text-text-secondary",
        "shadow-2xs transition-all hover:border-border-button-hover hover:text-text-primary shrink-0"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <FileIcon className="size-3.5 text-accent-500 shrink-0" />
        <span className="max-w-[130px] truncate font-medium text-text-primary" title={item.name}>
          {item.name}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {sizeLabel ? (
          <span className="text-caption-2-medium text-text-tertiary font-mono">
            ({sizeLabel})
          </span>
        ) : null}
        <button
          type="button"
          aria-label={t("chat.removeItem", { name: item.name })}
          onClick={() => removeComposerAsset(item.id)}
          className="flex size-3.5 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
        >
          <RiCloseLine className="size-3" />
        </button>
      </div>
    </div>
  )
}

export function ComposerAssetLightbox({
  preview,
  onClose
}: {
  preview: { src: string; name: string; size?: number } | null
  onClose: () => void
}) {
  return (
    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 border border-border-button-default bg-background-primary-default shadow-2xl">
        {preview ? (
          <div className="flex flex-col">
            <DialogHeader className="border-b border-border-button-default/60 px-4 py-3">
              <DialogTitle className="text-caption-1-semibold text-text-primary truncate">
                {preview.name}
              </DialogTitle>
              <p className="text-caption-2-regular text-text-tertiary">
                {preview.size ? formatFileSize(preview.size) : ""}
              </p>
            </DialogHeader>

            <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-background-secondary-default/30 p-4">
              <img
                src={preview.src}
                alt={preview.name}
                className="max-h-[60vh] max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
