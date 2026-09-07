/**
 * 更新快照的纯函数：百分比与发行说明整形。
 */

/** 下载进度夹到 0–100 整数，NaN 当 0。 */
export function clampUpdatePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** GitHub / electron-updater 的 releaseNotes 可能是字符串或 {note}[]。 */
export function notesFromRelease(releaseNotes: unknown): string {
  if (typeof releaseNotes === "string") return releaseNotes.trim()
  if (!Array.isArray(releaseNotes)) return ""
  return releaseNotes
    .map((item) => {
      if (typeof item === "string") return item
      if (item && typeof item === "object" && "note" in item && typeof item.note === "string") {
        return item.note
      }
      return ""
    })
    .filter(Boolean)
    .join("\n\n")
    .trim()
}
