/**
 * Composer 附件智能浮动托盘 (Smart Adaptive Attachment Shelf & Drawer)
 * 1. 紧凑态：图片与文件分区呈现、超出阈值折叠 (+N 徽标)、彻底消除原生滚动条。
 * 2. 展开态：就地变形为轻量紧凑资产抽屉（无重复渲染、紧凑流式自适应排布、大图 Lightbox 与一键清空）。
 */
import { useEffect, useState } from "react"
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
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
import { useT } from "@renderer/i18n"

function formatFileSize(bytes?: number): string {
  if (bytes == null || bytes === 0) return ""
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["ts", "tsx", "js", "jsx", "json", "py", "rs", "go", "html", "css", "sql", "sh"].includes(ext)) {
    return RiFileCodeLine
  }
  if (["md", "txt", "log", "doc", "docx", "pdf"].includes(ext)) {
    return RiFileTextLine
  }
  return RiFileLine
}

export function ComposerQueue({ className }: { className?: string }) {
  const t = useT()
  const [items, setItems] = useState<QueuedComposerAsset[]>(() => listComposerAssets())
  const [isExpanded, setIsExpanded] = useState(false)
  const [activePreview, setActivePreview] = useState<{
    src: string
    name: string
    size?: number
    mediaType?: string
  } | null>(null)

  useEffect(() => subscribeComposerAssets(setItems), [])

  if (items.length === 0) return null

  const images = items.filter((item) =>
    isImageMediaType(resolveMediaType(item.name, item.mediaType))
  )
  const files = items.filter(
    (item) => !isImageMediaType(resolveMediaType(item.name, item.mediaType))
  )

  const summaryLabel =
    images.length > 0 && files.length > 0
      ? t("chat.imagesAndFiles", { images: images.length, files: files.length })
      : images.length > 0
        ? t("chat.imagesCount", { count: images.length })
        : t("chat.filesCount", { count: files.length })

  // 紧凑模式下超过 3 项自动折叠
  const visibleImages = images.slice(0, 2)
  const hiddenImagesCount = images.length - visibleImages.length

  const visibleFiles = files.slice(0, 2)
  const hiddenFilesCount = files.length - visibleFiles.length

  return (
    <>
      {/* 顶部探出式层叠附件托盘 (Layered Shelf) */}
      <div
        className={cx(
          "relative z-0 mx-auto flex w-[93%] sm:w-[95%] flex-col gap-2",
          "-mb-3.5 rounded-t-2xl border-x border-t border-border-button-default/80",
          "bg-background-secondary-default/95 px-3.5 pt-2 pb-4 shadow-2xs backdrop-blur-md",
          "animate-in fade-in-50 slide-in-from-bottom-2 duration-200 select-none",
          className
        )}
      >
        {isExpanded ? (
          /* 展开态：一体化紧凑检视抽屉（无重复渲染，紧凑流式布局） */
          <div className="flex flex-col gap-2.5 w-full">
            {/* 顶栏：标题 + 收起 + 清空 */}
            <div className="flex items-center justify-between border-b border-border-button-default/60 pb-1.5 text-caption-2-medium">
              <div className="inline-flex items-center gap-1 font-semibold text-text-primary">
                <RiAttachmentLine className="size-3 text-accent-500" aria-hidden />
                <span>{t("chat.attachedAssets", { count: items.length })}</span>
                <span className="font-normal text-text-tertiary">· {summaryLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary cursor-pointer transition-colors"
                >
                  <span>{t("chat.collapseQueue")}</span>
                  <RiArrowUpSLine className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={clearComposerAssets}
                  title={t("chat.clearAttachments")}
                  className="flex size-5.5 items-center justify-center rounded-md text-text-tertiary hover:bg-background-tertiary-default hover:text-text-error-primary cursor-pointer transition-colors"
                >
                  <RiDeleteBin7Line className="size-3.5" />
                </button>
              </div>
            </div>

            {/* 展开内容区：图片紧凑画廊 + 文件紧凑流 */}
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar [scrollbar-width:none] pr-0.5">
              {images.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {images.map((item) => (
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
                  ))}
                </div>
              ) : null}

              {images.length > 0 && files.length > 0 ? (
                <div className="w-full h-px bg-border-button-default/60 my-0.5" />
              ) : null}

              {files.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {files.map((item) => (
                    <FileAttachmentItem key={item.id} item={item} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          /* 紧凑态：单行紧凑自适应横排 */
          <div className="flex items-center justify-between gap-2.5 w-full">
            {/* 左侧：紧凑平铺区 */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
              {/* 1. 图片分组 */}
              {images.length > 0 ? (
                <div className="flex shrink-0 items-center gap-2">
                  {(images.length <= 3 ? images : visibleImages).map((item) => (
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
                  ))}

                  {/* 折叠徽标 */}
                  {images.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(true)}
                      title={t("chat.viewAllImages", { count: images.length })}
                      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border-button-default/80 bg-background-primary-default text-caption-2-medium font-semibold text-accent-500 shadow-2xs transition-all hover:bg-background-secondary-hover hover:border-accent-500/50"
                    >
                      +{hiddenImagesCount}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* 2. 垂直分割线 */}
              {images.length > 0 && files.length > 0 ? (
                <div className="h-6 w-px shrink-0 bg-border-button-default/80" aria-hidden />
              ) : null}

              {/* 3. 文件分组 */}
              {files.length > 0 ? (
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(files.length <= 3 ? files : visibleFiles).map((item) => (
                    <FileAttachmentItem key={item.id} item={item} />
                  ))}

                  {/* 折叠徽标 */}
                  {files.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(true)}
                      title={t("chat.viewAllFiles", { count: files.length })}
                      className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border-button-default/80 bg-background-primary-default px-2.5 text-caption-2-medium font-semibold text-accent-500 shadow-2xs transition-all hover:bg-background-secondary-hover hover:border-accent-500/50"
                    >
                      {t("chat.moreCount", { count: hiddenFilesCount })}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* 右侧：汇总与展开 */}
            <div className="flex shrink-0 items-center gap-1.5 border-l border-border-button-default/70 pl-2 text-caption-2-medium text-text-tertiary">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                title={t("chat.expandAttachments")}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-text-secondary transition-colors hover:bg-background-tertiary-default hover:text-text-primary cursor-pointer"
              >
                <RiAttachmentLine className="size-3 text-accent-500" aria-hidden />
                <span>{summaryLabel}</span>
                <RiArrowDownSLine className="size-3.5 text-text-tertiary" aria-hidden />
              </button>
              <button
                type="button"
                onClick={clearComposerAssets}
                title={t("chat.clearAttachments")}
                className="flex size-5.5 cursor-pointer items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-tertiary-default hover:text-text-error-primary"
              >
                <RiDeleteBin7Line className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        )}
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
            <RiImageLine className="size-4.5 text-foreground-icon-secondary" />
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

function FileAttachmentItem({ item }: { item: QueuedComposerAsset }) {
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
          <span className="text-[10px] text-text-tertiary font-mono">
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
