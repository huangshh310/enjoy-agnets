/**
 * 本轮真实运行耗时：整数秒，对齐 Cursor / monocode 的 3m 14s。
 * 不要用思考头的 16.1 秒小数格式，也不要编造起点。
 */
import type { AppLocale } from "@renderer/i18n/locale"

export function formatRunElapsed(ms: number, locale: AppLocale): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  if (mins === 0) return locale === "zh" ? `${secs}秒` : `${secs}s`
  return locale === "zh" ? `${mins}分 ${secs}秒` : `${mins}m ${secs}s`
}
