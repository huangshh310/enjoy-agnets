/**
 * 额度悬停文案：纯函数，不拉 inspect / capabilities。
 */
export function quotaHintText(
  percent: number | null,
  reset: string | undefined,
  used: (percent: string) => string
): string | undefined {
  if (percent == null) return reset
  const line = used(`${Math.round(percent)}%`)
  return reset ? `${line} · ${reset}` : line
}
