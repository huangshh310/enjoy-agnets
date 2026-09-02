/**
 * 资产与媒体工作室：类型定义与常量。
 */
import type { TranslateFn } from "@renderer/i18n"

export type StudioMode = "image" | "speech" | "video" | "transcribe"

export type StudioGenerateKind = "image" | "speech" | "video" | "transcription" | "translation"

/** 侧栏分类过滤类型 */
export const ASSET_CATEGORIES = ["all", "image", "audio", "video", "file"] as const

export type AssetCategory = (typeof ASSET_CATEGORIES)[number]

/** 每页 4 列 × 4 行 */
export const PAGE_SIZE = 16

const LIBRARY_NAV_KEYS: Record<AssetCategory, string> = {
  all: "pages.media.allAssets",
  image: "pages.media.images",
  audio: "pages.media.audioSpeech",
  video: "pages.media.videos",
  file: "pages.media.documents"
}

const CATEGORY_KEYS: Record<AssetCategory, string> = {
  all: "pages.media.allAssets",
  image: "pages.media.images",
  audio: "pages.media.audioSpeech",
  video: "pages.media.videos",
  file: "pages.media.documentsFiles"
}

export function getLibraryNavItems(t: TranslateFn): { id: AssetCategory; label: string }[] {
  return ASSET_CATEGORIES.map((id) => ({ id, label: t(LIBRARY_NAV_KEYS[id]) }))
}

export function getCategoryLabel(t: TranslateFn, id: AssetCategory): string {
  return t(CATEGORY_KEYS[id])
}

export function isAssetCategory(id: string): id is AssetCategory {
  return (ASSET_CATEGORIES as readonly string[]).includes(id)
}
