/**
 * 官方用量 API 的公开字段解析。卡片用已用百分比，不用容易漂的预计算字段。
 */
import type { AgentToolAuthAccount, AgentToolQuotaInfo, ModelQuotaItem } from "@enjoy-agents/ipc-contract"
import { countdownFrom } from "./parse.ts"

export function parseCursorDashboardUsage(raw: unknown): AgentToolQuotaInfo | undefined {
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
  const items: ModelQuotaItem[] = [
    quotaItem("included", "Included", usedPercent, resetTime),
    quotaItem("auto", "Cursor Models", asFinite(plan?.autoPercentUsed), resetTime),
    quotaItem("api", "Other Models", asFinite(plan?.apiPercentUsed), resetTime)
  ].filter((item): item is ModelQuotaItem => Boolean(item))
  return {
    hasQuota: true,
    usedPercent,
    windowType: "Included",
    details: asString(json.displayMessage),
    resetsIn: countdownFrom(resetTime) ?? undefined,
    modelQuotas: items
  }
}

export function parseGrokBillingCredits(raw: unknown): AgentToolQuotaInfo | undefined {
  const root = asRecord(raw)
  const cfg = asRecord(root?.config) ?? root
  if (!cfg) return undefined
  const weekly = asFinite(cfg.creditUsagePercent)
  if (weekly == null) return undefined
  const period = asRecord(cfg.currentPeriod)
  const resetTime = asString(period?.end) ?? null
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
  return {
    hasQuota: true,
    usedPercent: weekly,
    windowType: "Grok · weekly",
    resetsIn: countdownFrom(resetTime) ?? undefined,
    modelQuotas: items
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
