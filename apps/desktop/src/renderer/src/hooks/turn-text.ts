/**
 * 消息正文兜底：用户气泡 / Extract 共用，不要两处各写一遍 trim。
 */

export function fallbackText(content: string, fallback?: string) {
  return content.trim() || fallback?.trim() || ""
}
