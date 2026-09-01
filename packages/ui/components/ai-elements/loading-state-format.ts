/**
 * Beautiful UI Loading State 的耗时文案。
 * 不足 1 分钟用 `1.4s`，否则用 `3m 16.1s`。
 */
export function formatElapsedMs(ms: number): string {
  const clamped = Math.max(0, ms)
  if (clamped < 60_000) return `${(clamped / 1000).toFixed(1)}s`
  const mins = Math.floor(clamped / 60_000)
  const secs = ((clamped % 60_000) / 1000).toFixed(1)
  return `${mins}m ${secs}s`
}
