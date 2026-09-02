/**
 * Beautiful UI Loading State 的耗时文案。
 * 不足 1 分钟用秒，否则用分+秒；数字格式不变，单位随语言切换。
 */
import { uiT } from "../../i18n/ui-locale.ts"

export function formatElapsedMs(ms: number): string {
  const clamped = Math.max(0, ms)
  if (clamped < 60_000) {
    const secs = (clamped / 1000).toFixed(1)
    return uiT(`${secs}秒`, `${secs}s`)
  }
  const mins = Math.floor(clamped / 60_000)
  const secs = ((clamped % 60_000) / 1000).toFixed(1)
  return uiT(`${mins}分 ${secs}秒`, `${mins}m ${secs}s`)
}
