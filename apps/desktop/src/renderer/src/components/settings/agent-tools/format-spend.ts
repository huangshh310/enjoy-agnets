/** 花费 / token 短格式，对标 OpenUsage 的 $2.06K、1.5B。 */

export function formatTokens(n: number | undefined): string {
  if (n == null || n === 0) return "0"
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatDollars(amount: number | undefined): string {
  if (amount == null || amount === 0) return "$0"
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`
  return `$${amount.toFixed(2)}`
}

export function formatSpendLine(costUsd?: number, tokens?: number): string | null {
  if ((tokens == null || tokens === 0) && (costUsd == null || costUsd === 0)) return null
  const tokenPart = formatTokens(tokens ?? 0)
  if (costUsd && costUsd > 0) return `${formatDollars(costUsd)} · ${tokenPart}`
  return tokenPart
}

export function formatRunOut(targetMs: number): string {
  const diff = Math.max(0, targetMs - Date.now())
  const hours = Math.floor(diff / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
