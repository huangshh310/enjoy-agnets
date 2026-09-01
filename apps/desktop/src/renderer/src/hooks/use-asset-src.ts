/**
 * 资产预览 data URL：有 url 用现成的，否则走 assets.read。
 */
import { useEffect, useState } from "react"
import { getIde, hasIde } from "@renderer/lib/ide"

export function useAssetSrc(assetId: string, mediaType?: string, fallbackUrl?: string) {
  const [src, setSrc] = useState<string | null>(fallbackUrl ?? null)

  useEffect(() => {
    let active = true
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
