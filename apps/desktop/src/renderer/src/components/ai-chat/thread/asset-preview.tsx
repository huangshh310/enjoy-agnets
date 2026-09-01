/**
 * 用户附件缩略图 / 助手生图 BeUI 表面；点图 Dialog 放大。
 */
import { useState } from "react"
import { RiFileLine, RiFileTextLine } from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { cx } from "@/utils/cx"
import { ImageGeneration } from "@/components/ai-elements/image-generation"
import { isImageMediaType, isVideoMediaType, resolveMediaType } from "@enjoy-agents/assets/media-type"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { useAssetSrc } from "@renderer/hooks/use-asset-src"
import { VideoGeneration } from "./video-generating"

function getFileTypeLabel(name: string, mediaType?: string): string {
  const ext = name.split(".").pop()?.toUpperCase()
  if (ext && ext.length <= 4) return `${ext} 文件`
  if (mediaType) return mediaType
  return "文件"
}

export function AssetPreview({
  assets,
  align = "start",
  prompt
}: {
  assets: NonNullable<ThreadMessage["assets"]>
  align?: "start" | "end"
  prompt?: string
}) {
  const [activePreview, setActivePreview] = useState<{ src: string; name: string; mediaType?: string } | null>(null)

  return (
    <>
      <ul className={cx("flex flex-wrap gap-2 w-full", align === "end" ? "justify-end" : "justify-start")}>
        {assets.map((asset) => (
          <li
            key={asset.assetId}
            className={cx(
              "list-none max-w-full",
              align === "start" && isImageMediaType(resolveMediaType(asset.name, asset.mediaType)) && "w-full"
            )}
          >
            {isImageMediaType(resolveMediaType(asset.name, asset.mediaType)) ? (
              <InlineImage
                asset={asset}
                prompt={prompt}
                generated={align === "start"}
                onOpenPreview={(src) => setActivePreview({ src, name: asset.name, mediaType: asset.mediaType })}
              />
            ) : isVideoMediaType(resolveMediaType(asset.name, asset.mediaType)) ? (
              <InlineVideo asset={asset} prompt={prompt} generated={align === "start"} />
            ) : (
              <div
                className={cx(
                  "flex items-center gap-2.5 rounded-2xl border border-separator-border",
                  "bg-background-secondary-default px-3.5 py-2 text-left max-w-xs"
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-background-tertiary-default text-foreground-icon-secondary">
                  {asset.name.endsWith(".md") || asset.name.endsWith(".txt") ? (
                    <RiFileTextLine className="size-4.5" />
                  ) : (
                    <RiFileLine className="size-4.5" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-caption-1-medium text-text-primary" title={asset.name}>
                    {asset.name}
                  </span>
                  <span className="text-caption-2-medium text-text-tertiary">
                    {getFileTypeLabel(asset.name, asset.mediaType)}
                  </span>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

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
                {activePreview.mediaType ? (
                  <p className="text-caption-1-medium text-text-tertiary">{activePreview.mediaType}</p>
                ) : null}
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

type PreviewAsset = NonNullable<ThreadMessage["assets"]>[number]

function InlineVideo({
  asset,
  prompt,
  generated
}: {
  asset: PreviewAsset
  prompt?: string
  generated?: boolean
}) {
  const src = useAssetSrc(asset.assetId, asset.mediaType, asset.url)
  return (
    <VideoGeneration status={src ? "complete" : "generating"} prompt={generated ? prompt : undefined}>
      {src ? <video src={src} controls className="size-full object-cover" /> : null}
    </VideoGeneration>
  )
}

function InlineImage({
  asset,
  prompt,
  generated,
  onOpenPreview
}: {
  asset: PreviewAsset
  prompt?: string
  generated?: boolean
  onOpenPreview?: (src: string) => void
}) {
  const src = useAssetSrc(asset.assetId, asset.mediaType, asset.url)
  if (!generated) return <AttachedImage name={asset.name} src={src} onOpen={onOpenPreview} />
  return <GeneratedImage name={asset.name} src={src} prompt={prompt} onOpen={onOpenPreview} />
}

function AttachedImage({
  name,
  src,
  onOpen
}: {
  name: string
  src: string | null
  onOpen?: (src: string) => void
}) {
  if (!src) {
    return (
      <span className="inline-flex rounded-full border border-separator-border bg-background-secondary-default px-2.5 py-1 text-body-medium text-text-secondary">
        {name}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpen?.(src)}
      className="group cursor-pointer rounded-2xl border-0 bg-transparent p-0 focus:outline-none"
      title={`Click to preview ${name}`}
    >
      <img
        src={src}
        alt={name}
        className="max-h-48 rounded-2xl border-0 object-contain transition-transform duration-200 group-hover:scale-[1.02]"
      />
    </button>
  )
}

function GeneratedImage({
  name,
  src,
  prompt,
  onOpen
}: {
  name: string
  src: string | null
  prompt?: string
  onOpen?: (src: string) => void
}) {
  return (
    <ImageGeneration
      status={src ? "complete" : "generating"}
      prompt={prompt}
      showStatus
      size="fluid"
      label={name}
      className="w-80 max-w-full"
    >
      {src ? (
        <button
          type="button"
          onClick={() => onOpen?.(src)}
          className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          title={`Click to preview ${name}`}
        >
          <img src={src} alt={name} />
        </button>
      ) : null}
    </ImageGeneration>
  )
}
