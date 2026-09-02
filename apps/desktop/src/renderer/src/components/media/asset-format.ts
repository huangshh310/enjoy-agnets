/**
 * 卡片元数据：体积与扩展名标签。
 */
import type { TranslateFn } from "@renderer/i18n"

const BYTE_UNIT_KEYS = [
  "pages.media.unitB",
  "pages.media.unitKb",
  "pages.media.unitMb",
  "pages.media.unitGb"
] as const

export function formatBytes(bytes: number, t: TranslateFn): string {
  if (bytes <= 0) return t("pages.media.zeroBytes")
  const unitIndex = Math.min(BYTE_UNIT_KEYS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** unitIndex
  return `${Number(value.toFixed(1))} ${t(BYTE_UNIT_KEYS[unitIndex])}`
}

export function fileExtensionLabel(name: string, mediaType: string, t: TranslateFn): string {
  const fromName = name.split(".").pop()?.toUpperCase()
  if (fromName && fromName.length <= 4) return fromName
  return mediaType.split("/")[1]?.toUpperCase() ?? t("pages.media.fileFallback")
}
