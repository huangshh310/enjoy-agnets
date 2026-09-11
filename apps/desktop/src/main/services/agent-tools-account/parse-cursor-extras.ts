/**
 * Cursor 额外窗口：Grok Bot 走 GetSandUsageStatus，Extra Usage 走 usage-summary。
 * GetCurrentPeriodUsage 里没有这两项。
 */
import type { QuotaWindowItem } from "@enjoy-agents/ipc-contract"
import { countdownFrom } from "./parse.ts"
import { calculateQuotaPacing, DURATION_7_DAYS_MS, DURATION_30_DAYS_MS } from "./quota-pacing.ts"

export function parseCursorGrokBotUsage(raw: unknown, now: Date = new Date()): QuotaWindowItem | undefined {
  const json = asRecord(raw)
  if (!json) return undefined
  if (json.usesPooledEnterpriseAllowance === true) return undefined
  if (json.hasNonZeroIncludedLimit === false) return undefined
  if (json.includedLimitZero === true) return undefined
  const percent = asFinite(json.usagePercent)
  if (percent == null || percent < 0) return undefined
  const used = Math.min(100, Math.max(0, percent))
  const resetAt = parseIsoMs(json.nextResetTimestampUtc)
  const startAt = parseIsoMs(json.currentPeriodStart)
  const duration =
    resetAt != null && startAt != null && resetAt > startAt ? resetAt - startAt : DURATION_7_DAYS_MS
  const resetTime = resetAt != null ? new Date(resetAt).toISOString() : null
  return {
    id: "grok-bot",
    name: "grok-bot",
    displayName: "Grok Bot",
    usedPercent: used,
    resetsIn: countdownFrom(resetTime),
    resetAt,
    windowType: "weekly",
    pacing: calculateQuotaPacing(used, duration, resetAt, now.getTime())
  }
}

export function parseCursorExtraUsage(raw: unknown, now: Date = new Date()): QuotaWindowItem {
  const empty: QuotaWindowItem = {
    id: "extra-usage",
    name: "extra-usage",
    displayName: "Extra Usage",
    usedPercent: 0,
    statusText: "No data"
  }
  const json = asRecord(raw)
  if (!json) return empty
  const individual = asRecord(json.individualUsage)
  const team = asRecord(json.teamUsage)
  const bucket = pickOnDemand(individual?.onDemand) ?? pickOnDemand(team?.onDemand)
  if (!bucket) return empty
  const usedCents = asFinite(bucket.used)
  const limitCents = asFinite(bucket.limit)
  if (limitCents != null && limitCents > 0 && usedCents != null) {
    const used = Math.min(100, Math.max(0, (usedCents / limitCents) * 100))
    return {
      id: "extra-usage",
      name: "extra-usage",
      displayName: "Extra Usage",
      usedPercent: used,
      windowType: "credit",
      pacing: calculateQuotaPacing(used, DURATION_30_DAYS_MS, null, now.getTime())
    }
  }
  if (usedCents != null && usedCents > 0) {
    return {
      ...empty,
      statusText: `$${(usedCents / 100).toFixed(2)}`
    }
  }
  return empty
}

function pickOnDemand(value: unknown): Record<string, unknown> | undefined {
  const bucket = asRecord(value)
  if (!bucket || bucket.enabled === false) return undefined
  return bucket
}

function parseIsoMs(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

function asFinite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
