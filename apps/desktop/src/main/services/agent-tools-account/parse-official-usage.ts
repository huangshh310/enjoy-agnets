/**
 * 官方用量 API 的公开字段解析。
 * 对标 OpenUsage：解析各家多窗口、Pacing 燃尽预测、Reset 信用点与专项模型限额。
 */
import type {
  AgentToolAuthAccount,
  AgentToolQuotaInfo,
  ModelQuotaItem,
  QuotaWindowItem,
  RateLimitResetCredit
} from "@enjoy-agents/ipc-contract"
import { countdownFrom } from "./parse.ts"
import {
  calculateQuotaPacing,
  DURATION_5_HOURS_MS,
  DURATION_7_DAYS_MS,
  DURATION_30_DAYS_MS
} from "./quota-pacing.ts"

export function parseCursorDashboardUsage(raw: unknown, now: Date = new Date()): AgentToolQuotaInfo | undefined {
  const json = asRecord(raw)
  if (!json) return undefined
  const plan = asRecord(json.planUsage)
  const included = asFinite(plan?.includedSpend)
  const limit = asFinite(plan?.limit)
  const fromSpend = included != null && limit && limit > 0 ? clamp((included / limit) * 100) : undefined
  const fromMessage = percentFromMessage(asString(json.displayMessage))
  const usedPercent = fromSpend ?? fromMessage
  if (usedPercent == null) return undefined
  const resetTime = msToIso(json.billingCycleEnd)
  const resetAtMs = json.billingCycleEnd ? Number(json.billingCycleEnd) : null

  const items: ModelQuotaItem[] = [
    quotaItem("included", "Included", usedPercent, resetTime),
    quotaItem("auto", "Cursor Models", asFinite(plan?.autoPercentUsed), resetTime),
    quotaItem("api", "Other Models", asFinite(plan?.apiPercentUsed), resetTime)
  ].filter((item): item is ModelQuotaItem => Boolean(item))

  const windows: QuotaWindowItem[] = [
    {
      id: "included",
      name: "included",
      displayName: "Total Usage",
      usedPercent,
      resetsIn: countdownFrom(resetTime),
      resetAt: resetAtMs,
      windowType: "monthly",
      pacing: calculateQuotaPacing(usedPercent, DURATION_30_DAYS_MS, resetAtMs, now.getTime())
    }
  ]

  if (asFinite(plan?.autoPercentUsed) != null) {
    const autoUsed = clamp(asFinite(plan?.autoPercentUsed)!)
    windows.push({
      id: "cursor-models",
      name: "cursor-models",
      displayName: "Cursor Models",
      usedPercent: autoUsed,
      resetsIn: countdownFrom(resetTime),
      resetAt: resetAtMs,
      windowType: "monthly",
      pacing: calculateQuotaPacing(autoUsed, DURATION_30_DAYS_MS, resetAtMs, now.getTime())
    })
  }

  if (asFinite(plan?.apiPercentUsed) != null) {
    const apiUsed = clamp(asFinite(plan?.apiPercentUsed)!)
    windows.push({
      id: "other-models",
      name: "other-models",
      displayName: "Other Models",
      usedPercent: apiUsed,
      resetsIn: countdownFrom(resetTime),
      resetAt: resetAtMs,
      windowType: "monthly",
      pacing: calculateQuotaPacing(apiUsed, DURATION_30_DAYS_MS, resetAtMs, now.getTime())
    })
  }

  return {
    hasQuota: true,
    usedPercent,
    windowType: "Included",
    details: asString(json.displayMessage),
    resetsIn: countdownFrom(resetTime) ?? undefined,
    modelQuotas: items,
    windows
  }
}

export function parseClaudeUsageResponse(raw: unknown, now: Date = new Date()): AgentToolQuotaInfo | undefined {
  const json = asRecord(raw)
  if (!json) return undefined

  const fiveHour = asRecord(json.five_hour)
  const sevenDay = asRecord(json.seven_day)
  const sevenDaySonnet = asRecord(json.seven_day_sonnet)

  const sessionPercent = asFinite(fiveHour?.used_percent)
  const weeklyPercent = asFinite(sevenDay?.used_percent)

  if (sessionPercent == null && weeklyPercent == null) return undefined

  const sessionResetTime = asString(fiveHour?.resets_at) ?? null
  const sessionResetMs = sessionResetTime ? new Date(sessionResetTime).getTime() : null
  const weeklyResetTime = asString(sevenDay?.resets_at) ?? null
  const weeklyResetMs = weeklyResetTime ? new Date(weeklyResetTime).getTime() : null

  const windows: QuotaWindowItem[] = []
  const modelQuotas: ModelQuotaItem[] = []

  if (sessionPercent != null) {
    const sUsed = clamp(sessionPercent)
    windows.push({
      id: "session",
      name: "session",
      displayName: "Session (5h)",
      usedPercent: sUsed,
      resetsIn: countdownFrom(sessionResetTime),
      resetAt: sessionResetMs,
      windowType: "session",
      pacing: calculateQuotaPacing(sUsed, DURATION_5_HOURS_MS, sessionResetMs, now.getTime())
    })
    modelQuotas.push({
      name: "session",
      displayName: "Session (5h)",
      percentage: sUsed,
      resetsIn: countdownFrom(sessionResetTime),
      resetTime: sessionResetTime
    })
  }

  if (weeklyPercent != null) {
    const wUsed = clamp(weeklyPercent)
    windows.push({
      id: "weekly",
      name: "weekly",
      displayName: "Weekly (7d)",
      usedPercent: wUsed,
      resetsIn: countdownFrom(weeklyResetTime),
      resetAt: weeklyResetMs,
      windowType: "weekly",
      pacing: calculateQuotaPacing(wUsed, DURATION_7_DAYS_MS, weeklyResetMs, now.getTime())
    })
    modelQuotas.push({
      name: "weekly",
      displayName: "Weekly (7d)",
      percentage: wUsed,
      resetsIn: countdownFrom(weeklyResetTime),
      resetTime: weeklyResetTime
    })
  }

  const sonnetPercent = asFinite(sevenDaySonnet?.used_percent)
  if (sonnetPercent != null) {
    const sonnetUsed = clamp(sonnetPercent)
    const sonnetResetTime = asString(sevenDaySonnet?.resets_at) ?? weeklyResetTime
    const sonnetResetMs = sonnetResetTime ? new Date(sonnetResetTime).getTime() : weeklyResetMs
    windows.push({
      id: "sonnet",
      name: "sonnet",
      displayName: "Sonnet Limit",
      usedPercent: sonnetUsed,
      resetsIn: countdownFrom(sonnetResetTime),
      resetAt: sonnetResetMs,
      windowType: "weekly",
      pacing: calculateQuotaPacing(sonnetUsed, DURATION_7_DAYS_MS, sonnetResetMs, now.getTime())
    })
    modelQuotas.push({
      name: "sonnet",
      displayName: "Sonnet",
      percentage: sonnetUsed,
      resetsIn: countdownFrom(sonnetResetTime),
      resetTime: sonnetResetTime
    })
  }

  const primaryUsed = sessionPercent ?? weeklyPercent ?? 0

  return {
    hasQuota: true,
    usedPercent: clamp(primaryUsed),
    windowType: sessionPercent != null ? "Session (5h)" : "Weekly (7d)",
    resetsIn: (sessionResetTime ? countdownFrom(sessionResetTime) : countdownFrom(weeklyResetTime)) ?? undefined,
    modelQuotas,
    windows
  }
}

export function parseCodexUsageResponse(
  rawUsage: unknown,
  rawCredits?: unknown,
  now: Date = new Date()
): AgentToolQuotaInfo | undefined {
  const json = asRecord(rawUsage)
  if (!json) return undefined

  const rateLimit = asRecord(json.rate_limit)
  const primary = asRecord(rateLimit?.primary_window)
  const secondary = asRecord(rateLimit?.secondary_window)

  const primaryUsed = asFinite(primary?.used_percent)
  const secondaryUsed = asFinite(secondary?.used_percent)

  if (primaryUsed == null && secondaryUsed == null) return undefined

  // OpenAI Codex primary window is usually 5 hours (18000s), secondary is 7 days (604800s)
  const primarySec = asFinite(primary?.limit_window_seconds) ?? 18000
  const primaryDurationMs = primarySec * 1000
  const primaryResetSec = asFinite(primary?.reset_at)
  const primaryResetMs = primaryResetSec ? primaryResetSec * 1000 : null
  const primaryResetIso = primaryResetMs ? new Date(primaryResetMs).toISOString() : null

  const secondarySec = asFinite(secondary?.limit_window_seconds) ?? 604800
  const secondaryDurationMs = secondarySec * 1000
  const secondaryResetSec = asFinite(secondary?.reset_at)
  const secondaryResetMs = secondaryResetSec ? secondaryResetSec * 1000 : null
  const secondaryResetIso = secondaryResetMs ? new Date(secondaryResetMs).toISOString() : null

  const windows: QuotaWindowItem[] = []
  const modelQuotas: ModelQuotaItem[] = []

  if (primaryUsed != null) {
    const pUsed = clamp(primaryUsed)
    const isSession = primaryDurationMs <= 6 * 3600 * 1000
    const label = isSession ? "Session (5h)" : "Weekly (7d)"
    windows.push({
      id: "primary",
      name: "primary",
      displayName: label,
      usedPercent: pUsed,
      resetsIn: countdownFrom(primaryResetIso),
      resetAt: primaryResetMs,
      windowType: isSession ? "session" : "weekly",
      pacing: calculateQuotaPacing(pUsed, primaryDurationMs, primaryResetMs, now.getTime())
    })
    modelQuotas.push({
      name: "primary",
      displayName: label,
      percentage: pUsed,
      resetsIn: countdownFrom(primaryResetIso),
      resetTime: primaryResetIso
    })
  }

  if (secondaryUsed != null) {
    const sUsed = clamp(secondaryUsed)
    windows.push({
      id: "secondary",
      name: "secondary",
      displayName: "Weekly (7d)",
      usedPercent: sUsed,
      resetsIn: countdownFrom(secondaryResetIso),
      resetAt: secondaryResetMs,
      windowType: "weekly",
      pacing: calculateQuotaPacing(sUsed, secondaryDurationMs, secondaryResetMs, now.getTime())
    })
    modelQuotas.push({
      name: "secondary",
      displayName: "Weekly (7d)",
      percentage: sUsed,
      resetsIn: countdownFrom(secondaryResetIso),
      resetTime: secondaryResetIso
    })
  }

  // Parse Rate Limit Reset Credits
  let resetCredits: AgentToolQuotaInfo["resetCredits"] = undefined
  const rateLimitCreditsObj = asRecord(json.rate_limit_reset_credits)
  const availableCount = asFinite(rateLimitCreditsObj?.available_count) ?? 0

  const creditsList: RateLimitResetCredit[] = []
  const creditsRoot = asRecord(rawCredits)
  const creditsArr = Array.isArray(creditsRoot?.credits) ? creditsRoot.credits : []
  for (const c of creditsArr) {
    const rec = asRecord(c)
    const id = asString(rec?.credit_id) || asString(rec?.id)
    const expSec = asFinite(rec?.expires_at)
    if (id && expSec) {
      const expMs = expSec * 1000
      const expIso = new Date(expMs).toISOString()
      creditsList.push({
        id,
        expiresAt: expMs,
        expiresIn: countdownFrom(expIso) ?? "—"
      })
    }
  }

  if (availableCount > 0 || creditsList.length > 0) {
    resetCredits = {
      availableCount: Math.max(availableCount, creditsList.length),
      credits: creditsList.length > 0 ? creditsList : undefined,
      canClaim: true
    }
  }

  const primaryValue = primaryUsed ?? secondaryUsed ?? 0

  return {
    hasQuota: true,
    usedPercent: clamp(primaryValue),
    windowType: primaryUsed != null ? "Session (5h)" : "Weekly (7d)",
    resetsIn: (primaryResetIso ? countdownFrom(primaryResetIso) : countdownFrom(secondaryResetIso)) ?? undefined,
    modelQuotas,
    windows,
    resetCredits
  }
}

export function parseGrokBillingCredits(raw: unknown, now: Date = new Date()): AgentToolQuotaInfo | undefined {
  const root = asRecord(raw)
  const cfg = asRecord(root?.config) ?? root
  if (!cfg) return undefined
  const weekly = asFinite(cfg.creditUsagePercent)
  if (weekly == null) return undefined
  const period = asRecord(cfg.currentPeriod)
  const resetTime = asString(period?.end) ?? null
  const resetAtMs = resetTime ? new Date(resetTime).getTime() : null
  const products = Array.isArray(cfg.productUsage) ? cfg.productUsage : []

  const weeklyItem = quotaItem("weekly", "Grok · weekly", weekly, resetTime)
  const items: ModelQuotaItem[] = weeklyItem ? [weeklyItem] : []
  for (const entry of products) {
    const rec = asRecord(entry)
    const name = asString(rec?.product)
    const percent = asFinite(rec?.usagePercent)
    if (!name || percent == null) continue
    const item = quotaItem(name, name.replace(/([a-z])([A-Z])/g, "$1 $2"), percent, resetTime)
    if (item) items.push(item)
  }

  const windows: QuotaWindowItem[] = [
    {
      id: "weekly",
      name: "weekly",
      displayName: "Weekly",
      usedPercent: clamp(weekly),
      resetsIn: countdownFrom(resetTime),
      resetAt: resetAtMs,
      windowType: "weekly",
      pacing: calculateQuotaPacing(clamp(weekly), DURATION_7_DAYS_MS, resetAtMs, now.getTime())
    }
  ]

  for (const entry of products) {
    const rec = asRecord(entry)
    const name = asString(rec?.product)
    const percent = asFinite(rec?.usagePercent)
    if (!name || percent == null) continue
    windows.push({
      id: name,
      name,
      displayName: name.replace(/([a-z])([A-Z])/g, "$1 $2"),
      usedPercent: clamp(percent),
      resetsIn: countdownFrom(resetTime),
      resetAt: resetAtMs,
      windowType: "other",
      pacing: calculateQuotaPacing(clamp(percent), DURATION_7_DAYS_MS, resetAtMs, now.getTime())
    })
  }

  const onDemandCap = asFinite(asRecord(cfg.onDemandCap)?.val) ?? asFinite(cfg.onDemandCap) ?? 0
  windows.push({
    id: "extra-usage",
    name: "extra-usage",
    displayName: "Extra Usage",
    usedPercent: 0,
    statusText: onDemandCap > 0 ? `${onDemandCap} cap` : "Disabled"
  })

  return {
    hasQuota: true,
    usedPercent: clamp(weekly),
    windowType: "Grok · weekly",
    resetsIn: countdownFrom(resetTime) ?? undefined,
    modelQuotas: items,
    windows
  }
}

export function parseGrokAuthPublic(raw: unknown): Pick<AgentToolAuthAccount, "email" | "accountName" | "loggedIn"> | undefined {
  const root = asRecord(raw)
  if (!root) return undefined
  const cred = pickGrokCred(root)
  const email = asString(cred?.email)
  if (!email) return undefined
  const first = asString(cred?.first_name)
  const last = asString(cred?.last_name)
  return {
    loggedIn: true,
    email,
    accountName: [first, last].filter(Boolean).join(" ") || email
  }
}

export function pickGrokSessionKey(raw: unknown): string | undefined {
  const cred = pickGrokCred(asRecord(raw))
  const key = asString(cred?.key)
  return key && key.length > 8 ? key : undefined
}

function pickGrokCred(root?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!root) return undefined
  if (asString(root.email) && asString(root.key)) return root
  const values = Object.values(root)
  const creds = values.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)?.email))
  return creds[0]
}

function percentFromMessage(message?: string): number | undefined {
  if (!message) return undefined
  if (/hit your usage limit/i.test(message)) return 100
  const match = message.match(/used\s+(\d+(?:\.\d+)?)%/i)
  return match ? clamp(Number(match[1])) : undefined
}

function quotaItem(
  name: string,
  displayName: string,
  percent: number | undefined,
  resetTime: string | null
): ModelQuotaItem | undefined {
  if (percent == null) return undefined
  return { name, displayName, percentage: clamp(percent), resetsIn: countdownFrom(resetTime), resetTime }
}

function msToIso(value: unknown): string | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN
  return Number.isFinite(n) ? new Date(n).toISOString() : null
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function asFinite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value))
}
