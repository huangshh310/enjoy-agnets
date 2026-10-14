/**
 * Inbox 顶栏发生时间。中文用「10月10日 22:50」，避免 toLocaleString 截成「10/10/…」。
 */
export function formatInboxOccurredAt(ms: number, locale: "zh" | "en"): string {
  const at = new Date(ms)
  if (Number.isNaN(at.getTime())) return ""
  if (locale === "zh") {
    const hh = String(at.getHours()).padStart(2, "0")
    const mm = String(at.getMinutes()).padStart(2, "0")
    return `${at.getMonth() + 1}月${at.getDate()}日 ${hh}:${mm}`
  }
  return at.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}
