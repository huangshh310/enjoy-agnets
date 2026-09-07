/**
 * 本轮真实运行耗时：整数秒，对齐 Cursor / monocode 的 3m 14s。
 * 不要用思考头的 16.1 秒小数格式，也不要编造起点。
 */
type Translate = (path: string, vars?: Record<string, string | number>) => string

export function formatRunElapsed(ms: number, t: Translate): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  if (mins === 0) return t("chat.elapsedSeconds", { n: secs })
  return t("chat.elapsedMinutes", { m: mins, s: secs })
}
