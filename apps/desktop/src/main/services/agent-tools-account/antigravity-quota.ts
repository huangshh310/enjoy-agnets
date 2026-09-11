/**
 * Antigravity 公开配额。quota_groups.remaining_fraction 是剩余，进度条画已用。
 */
import type { AgentToolQuotaInfo, ModelQuotaItem, QuotaWindowItem } from "@enjoy-agents/ipc-contract"
import { calculateQuotaPacing, DURATION_5_HOURS_MS, DURATION_7_DAYS_MS } from "./quota-pacing.ts"

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function countdownFrom(resetTime?: string | null): string | null {
  if (!resetTime) return null
  const target = Date.parse(resetTime)
  if (Number.isNaN(target)) return null
  const diff = target - Date.now()
  if (diff <= 0) return "0m"
  const hours = Math.floor(diff / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function quotasFromAntigravityGroups(raw: unknown): ModelQuotaItem[] {
  if (!Array.isArray(raw)) return []
  const items: ModelQuotaItem[] = []
  for (const group of raw) {
    if (!group || typeof group !== "object") continue
    const rec = group as Record<string, unknown>
    const groupName = asString(rec.display_name) ?? "Quota"
    const buckets = rec.buckets
    if (!Array.isArray(buckets)) continue
    for (const bucket of buckets) {
      const item = bucketToQuota(groupName, bucket)
      if (item) items.push(item)
    }
  }
  return items.sort((a, b) => b.percentage - a.percentage)
}

export function usedFromRemaining(remaining: number): number {
  return Math.min(100, Math.max(0, (1 - remaining) * 100))
}

export function quotaFromAntigravity(
  groups: ModelQuotaItem[],
  tier?: string,
  details?: string
): AgentToolQuotaInfo | undefined {
  if (!groups.length) return undefined
  const worstUsed = Math.max(...groups.map((g) => g.percentage))
  const windows: QuotaWindowItem[] = groups.map((g) => {
    const is5h = g.name.toLowerCase().includes("5h") || g.name.toLowerCase().includes("session")
    const duration = is5h ? DURATION_5_HOURS_MS : DURATION_7_DAYS_MS
    const resetMs = g.resetTime ? new Date(g.resetTime).getTime() : null
    return {
      id: g.name,
      name: g.name,
      displayName: antigravityWindowLabel(g.displayName, g.name),
      usedPercent: g.percentage,
      resetsIn: g.resetsIn,
      resetAt: resetMs,
      windowType: is5h ? "session" : "weekly",
      pacing: calculateQuotaPacing(g.percentage, duration, resetMs)
    }
  })
  return {
    hasQuota: true,
    usedPercent: worstUsed,
    windowType: tier ?? "Antigravity",
    details,
    modelQuotas: groups,
    windows
  }
}

function antigravityWindowLabel(displayName: string, name: string): string {
  const text = `${displayName} ${name}`.toLowerCase()
  const weekly = text.includes("week")
  const gemini = text.includes("gemini")
  if (gemini && weekly) return "Weekly"
  if (gemini) return "Session"
  if (weekly) return "Claude Weekly"
  return "Claude"
}

function bucketToQuota(groupName: string, raw: unknown): ModelQuotaItem | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const rec = raw as Record<string, unknown>
  const remaining = typeof rec.remaining_fraction === "number" ? rec.remaining_fraction : undefined
  if (remaining == null || !Number.isFinite(remaining)) return undefined
  const resetTime = asString(rec.reset_time) ?? null
  const window = asString(rec.window) ?? asString(rec.bucket_id) ?? "limit"
  const shortGroup = groupName.replace(/\s+models$/i, "").replace(/\s+and\s+/i, " + ")
  return {
    name: `${shortGroup}:${window}`,
    displayName: `${shortGroup} · ${window}`,
    percentage: usedFromRemaining(remaining),
    resetsIn: countdownFrom(resetTime),
    resetTime
  }
}
