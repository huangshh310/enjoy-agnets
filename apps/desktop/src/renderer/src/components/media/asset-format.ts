/**
 * 卡片元数据：体积与扩展名标签。
 */

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B"
  const unitIndex = Math.min(BYTE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** unitIndex
  return `${Number(value.toFixed(1))} ${BYTE_UNITS[unitIndex]}`
}

export function fileExtensionLabel(name: string, mediaType: string): string {
  const fromName = name.split(".").pop()?.toUpperCase()
  if (fromName && fromName.length <= 4) return fromName
  return mediaType.split("/")[1]?.toUpperCase() ?? "FILE"
}
