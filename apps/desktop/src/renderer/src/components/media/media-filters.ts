/**
 * 资产库分类与搜索过滤。
 */
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import type { AssetCategory } from "./media-page.types"

export function isAudioLibraryAsset(asset: AssetRecord): boolean {
  return asset.kind === "audio" || asset.mediaType.toLowerCase().startsWith("audio/")
}

export function matchesAssetCategory(asset: AssetRecord, category: AssetCategory): boolean {
  if (category === "all") return true
  if (category === "file") return asset.kind === "file" || asset.kind === "pdf"
  return asset.kind === category
}

export function filterLibraryAssets(
  assets: AssetRecord[],
  category: AssetCategory,
  query: string
): AssetRecord[] {
  const needle = query.trim().toLowerCase()
  return assets.filter((asset) => {
    if (!matchesAssetCategory(asset, category)) return false
    if (!needle) return true
    return `${asset.name} ${asset.kind} ${asset.mediaType}`.toLowerCase().includes(needle)
  })
}

export function countLibraryAssets(assets: AssetRecord[]): Record<AssetCategory, number> {
  const counts: Record<AssetCategory, number> = {
    all: assets.length,
    image: 0,
    audio: 0,
    video: 0,
    file: 0
  }
  for (const asset of assets) {
    if (asset.kind === "image") counts.image += 1
    else if (asset.kind === "audio") counts.audio += 1
    else if (asset.kind === "video") counts.video += 1
    else counts.file += 1
  }
  return counts
}
