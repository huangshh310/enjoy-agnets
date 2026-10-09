/**
 * 额度悬停文案：纯函数，不拉 inspect / capabilities。
 * remaining 只把已经四舍五入的已用百分比换成 100 减它，没有官方数字时不要调用。
 */
export type UsageNumberMode = "used" | "remaining"

export function shownQuotaPercent(usedPercent: number, mode: UsageNumberMode = "used"): number {
  const used = Math.round(usedPercent)
  if (mode !== "remaining") return used
  return Math.min(100, Math.max(0, 100 - used))
}

export function quotaHintText(
  percent: number | null,
  reset: string | undefined,
  used: (percent: string) => string
): string | undefined {
  if (percent == null) return reset
  const line = used(`${Math.round(percent)}%`)
  return reset ? `${line} · ${reset}` : line
}
