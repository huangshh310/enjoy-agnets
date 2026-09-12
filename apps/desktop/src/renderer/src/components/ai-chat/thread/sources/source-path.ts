/**
 * 来源路径：展示名、相对缩短、过滤网页。禁止绝对盘符刷屏。
 */

export function displayBaseName(path?: string): string {
  if (!path) return ""
  const normalized = path.replaceAll("\\", "/")
  return normalized.split("/").pop() || normalized
}

/** 超过三级目录时只留末三段，避免盘符刷屏。 */
export function shortenSourcePath(path: string): string {
  const normalized = path.replaceAll("\\", "/")
  const parts = normalized.split("/").filter(Boolean)
  if (parts.length <= 3) return normalized.replace(/^\/+/, "")
  return parts.slice(-3).join("/")
}

export function isHttpSource(value?: string): boolean {
  return /^https?:\/\//i.test((value ?? "").trim())
}
