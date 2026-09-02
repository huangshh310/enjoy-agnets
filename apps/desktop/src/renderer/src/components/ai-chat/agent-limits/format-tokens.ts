/**
 * Token 数量展示：1M / 54.2k / 整数。
 */
export function formatTokens(num: number): string {
  if (num >= 1_000_000) {
    const val = num / 1_000_000
    return `${Number.isInteger(val) ? val : val.toFixed(1)}M`
  }
  if (num >= 1_000) {
    const val = num / 1_000
    return `${Number.isInteger(val) ? val : val.toFixed(1)}k`
  }
  return String(num)
}
