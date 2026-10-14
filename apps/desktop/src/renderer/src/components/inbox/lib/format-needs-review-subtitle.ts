/**
 * 待验收次行：有改动文件写「改了 a.ts、b.ts 等 N 个文件 · HH:mm」，否则只写时间。
 */
import type { InboxNotification } from "../inbox.types"

export function clockHm(at: string | number): string {
  const date = typeof at === "number" ? new Date(at) : new Date(at)
  if (Number.isNaN(date.getTime())) return ""
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

export function formatNeedsReviewSubtitle(
  item: Pick<InboxNotification, "changedFiles" | "completedAt" | "occurredAt">,
  t: (path: string, vars?: Record<string, string | number>) => string
): string {
  const time = clockHm(item.completedAt ?? item.occurredAt)
  if (!item.changedFiles || item.changedFiles.names.length === 0) return time
  const files = t("pages.inbox.changedFiles", {
    files: item.changedFiles.names.join("、"),
    total: item.changedFiles.total
  })
  return time ? `${files} · ${time}` : files
}
