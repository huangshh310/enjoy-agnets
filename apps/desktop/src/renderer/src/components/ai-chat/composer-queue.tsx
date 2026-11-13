/**
 * Composer 附件智能浮动托盘 (Smart Adaptive Attachment Shelf & Drawer)
 * 1. 紧凑态：图片与文件分区呈现、超出阈值折叠 (+N 徽标)、彻底消除原生滚动条。
 * 2. 展开态：就地变形为轻量紧凑资产抽屉（无重复渲染、紧凑流式自适应排布、大图 Lightbox 与一键清空）。
 */
import { attachmentSummaryLabel } from "./composer-count-labels"
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import {
  IDLE_COMPOSER_TRAY_BUDGET,
  useComposerTrayBudget,
  type ComposerTrayBudget
} from "./composer/use-composer-tray-budget.ts"
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiAttachmentLine,
  RiDeleteBin7Line
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import {
  clearComposerAssets,
  listComposerAssets,
  subscribeComposerAssets,
  type QueuedComposerAsset
} from "@renderer/hooks/composer-assets"
import { isImageMediaType, resolveMediaType } from "@enjoy-agents/assets/media-type"
import { useT } from "@renderer/i18n"
import {
  FileAttachmentItem,
  ImageAttachmentItem,
  ComposerAssetLightbox
} from "./composer-queue-items"

export function ComposerQueue({
  className,
  formRef,
  onBudgetChange
}: {
  className?: string
  formRef?: RefObject<HTMLElement | null>
  onBudgetChange?: (budget: ComposerTrayBudget) => void
}) {
  const t = useT()
  const [items, setItems] = useState<QueuedComposerAsset[]>(() => listComposerAssets())
  const [isExpanded, setIsExpanded] = useState(false)
  const trayRef = useRef<HTMLDivElement>(null)
  const fallbackFormRef = useRef<HTMLElement | null>(null)
  const budget = useComposerTrayBudget({
    enabled: items.length > 0 && formRef != null,
    formRef: formRef ?? fallbackFormRef,
    trayRef
  })
  const [activePreview, setActivePreview] = useState<{
    src: string
    name: string
    size?: number
    mediaType?: string
  } | null>(null)

  useEffect(() => subscribeComposerAssets(setItems), [])

  useLayoutEffect(() => {
    onBudgetChange?.(items.length > 0 ? budget : IDLE_COMPOSER_TRAY_BUDGET)
  }, [budget, items.length, onBudgetChange])

  if (items.length === 0) return null

  const images = items.filter((item) =>
    isImageMediaType(resolveMediaType(item.name, item.mediaType))
  )
  const files = items.filter(
    (item) => !isImageMediaType(resolveMediaType(item.name, item.mediaType))
  )

  // 英文单复数：count === 1 走 One 键（1 image / 1 file）。
  const summaryLabel = attachmentSummaryLabel(t, images.length, files.length)

  // 紧凑模式下超过 3 项自动折叠
  const visibleImages = images.slice(0, 2)
  const hiddenImagesCount = images.length - visibleImages.length

  const visibleFiles = files.slice(0, 2)
  const hiddenFilesCount = files.length - visibleFiles.length

  // 矮视口（运行时 slot < 108）：展开 / 紧凑都走横向单行条；展开态的顶栏并进同一行、全部附件横向滚动。
  const strip = budget.strip
  const showAll = strip && isExpanded

  return (
    <>
      {/* 顶部探出式层叠附件托盘 (Layered Shelf) */}
      <div
        ref={trayRef}
        data-testid="composer-attachment-tray"
        data-frost="tile"
        data-tray-strip={strip ? "true" : undefined}
        data-tray-slot={budget.slot ?? undefined}
        className={cx(
          // 舒适态：-mb 只让底部留白（pb-4）藏到输入框下，缩略图本身不被任何条盖住。
          // 单行条：mb=0，托盘底边落在 form.y 之上，不再叠进卡片。
          "relative z-0 mx-auto flex w-[93%] sm:w-[95%] shrink-0 flex-col gap-2",
          strip ? "mb-0" : "-mb-3.5",
          "rounded-t-2xl border-x border-t border-border-button-default/80",
          "bg-background-secondary-default/95 px-3.5 shadow-2xs backdrop-blur-md",
          strip ? "pt-1 pb-1" : "pt-2 pb-4",
          "animate-in fade-in-50 slide-in-from-bottom-2 duration-200 select-none",
          className
        )}
      >
        {isExpanded && !strip ? (
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
          /* 紧凑态 / 单行条：单行横排（单行条展开时附件全量横向滚动，顶栏并进右侧） */
          <div data-testid={strip ? "composer-attachment-strip" : undefined} className="flex items-center justify-between gap-2.5 w-full">
            {/* 左侧：紧凑平铺区 */}
            <div className={cx("flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", !strip && "py-0.5")}>
              {/* 1. 图片分组 */}
              {images.length > 0 ? (
                <div className="flex shrink-0 items-center gap-2">
                  {(showAll || images.length <= 3 ? images : visibleImages).map((item) => (
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
                  {!showAll && images.length > 3 ? (
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
                  {(showAll || files.length <= 3 ? files : visibleFiles).map((item) => (
                    <FileAttachmentItem key={item.id} item={item} />
                  ))}

                  {/* 折叠徽标 */}
                  {!showAll && files.length > 3 ? (
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

            {/* 右侧：汇总与展开；单行条展开时为「N 张图片 · 收起」 */}
            <div className="flex shrink-0 items-center gap-1.5 border-l border-border-button-default/70 pl-2 text-caption-2-medium text-text-tertiary">
              {showAll ? (
                <>
                  <span className="inline-flex items-center gap-1 font-medium text-text-secondary">
                    <RiAttachmentLine className="size-3 text-accent-500" aria-hidden />
                    <span>{summaryLabel}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary cursor-pointer transition-colors"
                  >
                    <span>{t("chat.collapseQueue")}</span>
                    <RiArrowUpSLine className="size-3.5" aria-hidden />
                  </button>
                </>
              ) : (
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
              )}
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
      <ComposerAssetLightbox preview={activePreview} onClose={() => setActivePreview(null)} />
    </>
  )
}
