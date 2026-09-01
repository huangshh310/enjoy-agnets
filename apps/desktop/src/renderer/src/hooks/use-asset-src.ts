/**
 * 资产预览 src：视频走 enjoy-asset://，图片走现成 url 或 assets.read data URL。
 */
import { useEffect, useState } from "react"
import { isVideoMediaType } from "@enjoy-agents/assets/media-type"
import { assetPlaybackUrl } from "@enjoy-agents/assets/playback-url"
import { getIde, hasIde } from "@renderer/lib/ide"

export function useAssetSrc(assetId: string, mediaType?: string, fallbackUrl?: string) {
  const [src, setSrc] = useState<string | null>(fallbackUrl ?? null)

  useEffect(() => {
    let active = true
    if (mediaType && isVideoMediaType(mediaType)) {
      setSrc(assetPlaybackUrl(assetId))
      return undefined
    }
    setSrc(fallbackUrl ?? null)
    if (fallbackUrl || !hasIde()) return undefined
    void getIde()
      .assets.read(assetId)
      .then((row) => {
        if (!active) return
        const record = row as { bytesBase64?: string; mediaType?: string }
        if (!record.bytesBase64) return
        setSrc(`data:${record.mediaType ?? mediaType ?? "image/png"};base64,${record.bytesBase64}`)
      })
    return () => {
      active = false
    }
  }, [assetId, fallbackUrl, mediaType])

  return src
}
