/**
 * 资产预览：图片内联，其它类型显示胶囊。二进制走 assets.read。
 */
import { useEffect, useState } from "react"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { ThreadMessage } from "@renderer/stores/chat-store"

export function AssetPreview({
  assets
}: {
  assets: NonNullable<ThreadMessage["assets"]>
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {assets.map((asset) => (
        <li key={asset.assetId}>
          {asset.mediaType.startsWith("image/") ? (
            <InlineImage asset={asset} />
          ) : (
            <span className="inline-flex rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-body-medium text-text-secondary">
              {asset.name}
              <span className="ml-1 text-text-tertiary">{asset.mediaType}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function InlineImage({
  asset
}: {
  asset: NonNullable<ThreadMessage["assets"]>[number]
}) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
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
  }, [asset.assetId, asset.mediaType])
  if (!src) {
    return (
      <span className="inline-flex rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-body-medium text-text-secondary">
        {asset.name}
      </span>
    )
  }
  return <img src={src} alt={asset.name} className="max-h-48 rounded-2xl border border-border-secondary-default" />
}
