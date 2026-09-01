/**
 * 资产与媒体工作室：类型定义与常量。
 */

export type StudioMode = "image" | "speech" | "video" | "transcribe"

export type StudioGenerateKind = "image" | "speech" | "video" | "transcription" | "translation"

/** 侧栏分类过滤类型 */
export const ASSET_CATEGORIES = ["all", "image", "audio", "video", "file"] as const

export type AssetCategory = (typeof ASSET_CATEGORIES)[number]

/** 每页 4 列 × 4 行 */
export const PAGE_SIZE = 16

export const LIBRARY_NAV_ITEMS: { id: AssetCategory; label: string }[] = [
  { id: "all", label: "All Assets" },
  { id: "image", label: "Images" },
  { id: "audio", label: "Audio & Speech" },
  { id: "video", label: "Videos" },
  { id: "file", label: "Documents" }
]

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  all: "All Assets",
  image: "Images",
  audio: "Audio & Speech",
  video: "Videos",
  file: "Documents & Files"
}

export function isAssetCategory(id: string): id is AssetCategory {
  return (ASSET_CATEGORIES as readonly string[]).includes(id)
}
