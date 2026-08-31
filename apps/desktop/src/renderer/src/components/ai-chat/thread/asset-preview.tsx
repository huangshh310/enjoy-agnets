import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { isImageMediaType, resolveMediaType } from "@enjoy-agents/assets/media-type"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { ThreadMessage } from "@renderer/stores/chat-store"

export function AssetPreview({
  assets
}: {
  assets: NonNullable<ThreadMessage["assets"]>
}) {
  const [activePreview, setActivePreview] = useState<{ src: string; name: string; mediaType?: string } | null>(null)

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {assets.map((asset) => (
          <li key={asset.assetId}>
            {isImageMediaType(resolveMediaType(asset.name, asset.mediaType)) ? (
              <InlineImage
                asset={asset}
                onOpenPreview={(src) => setActivePreview({ src, name: asset.name, mediaType: asset.mediaType })}
              />
            ) : (
              <span className="inline-flex rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-body-medium text-text-secondary">
                {asset.name}
                <span className="ml-1 text-text-tertiary">{asset.mediaType}</span>
              </span>
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

function InlineImage({
  asset,
  onOpenPreview
}: {
  asset: NonNullable<ThreadMessage["assets"]>[number]
  onOpenPreview?: (src: string) => void
}) {
  const [src, setSrc] = useState<string | null>(asset.url ?? null)
  useEffect(() => {
    if (src) return
    if (!hasIde()) return
    let revoked: string | null = null
    void getIde()
      .assets.read(asset.assetId)
      .then((row) => {
        const rec = row as { bytesBase64?: string; mediaType?: string }
        if (!rec.bytesBase64) return
        revoked = `data:${rec.mediaType ?? asset.mediaType};base64,${rec.bytesBase64}`
        setSrc(revoked)
      })
    return () => {
      revoked = null
    }
  }, [asset.assetId, asset.mediaType, src])
  if (!src) {
    return (
      <span className="inline-flex rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-body-medium text-text-secondary">
        {asset.name}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpenPreview?.(src)}
      className="group cursor-pointer rounded-2xl focus:outline-none"
      title={`Click to preview ${asset.name}`}
    >
      <img
        src={src}
        alt={asset.name}
        className="max-h-48 rounded-2xl object-contain transition-transform duration-200 group-hover:scale-[1.02] shadow-xs"
      />
    </button>
  )
}
