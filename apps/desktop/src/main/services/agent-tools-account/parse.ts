/**
 * 官方 CLI 公开 stdout 解析。不碰 token 字段，失败就返回空。
 */
import type { AgentCliModel, AgentToolAuthAccount, AgentToolQuotaInfo, ModelQuotaItem } from "@enjoy-agents/ipc-contract"

export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1))
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

export function firstLine(raw: string): string {
  return raw.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? ""
}

export function parseCursorStatus(raw: string): AgentToolAuthAccount | undefined {
  const json = parseJsonObject(raw)
  if (!json) return undefined
  const info = asRecord(json.userInfo)
  const email = asString(info?.email)
  const first = asString(info?.firstName)
  const last = asString(info?.lastName)
  const name = [first, last].filter(Boolean).join(" ") || email
  const loggedIn = asBoolean(json.isAuthenticated) ?? asString(json.status) === "authenticated"
  return {
    loggedIn,
    email,
    accountName: name,
    authMethod: "agent login",
    organization: "Cursor"
  }
}

export function mergeCursorAbout(account: AgentToolAuthAccount, raw: string): AgentToolAuthAccount {
  const json = parseJsonObject(raw)
  if (!json) return account
  return {
    ...account,
    loggedIn: account.loggedIn,
    email: account.email ?? asString(json.userEmail),
    tier: asString(json.subscriptionTier),
    cliVersion: asString(json.cliVersion),
    currentModel: asString(json.model),
    authMethod: account.authMethod ?? "agent login",
    organization: account.organization ?? "Cursor"
  }
}

export function parseCursorModels(raw: string): AgentCliModel[] {
  const models: AgentCliModel[] = []
  const seen = new Set<string>()
  for (const line of raw.split(/\r?\n/)) {
    const match = line.trim().match(/^([a-zA-Z0-9._:-]+)\s+-\s+(.+)$/)
    if (!match?.[1] || !match[2]) continue
    if (seen.has(match[1])) continue
    seen.add(match[1])
    models.push({ id: match[1], label: match[2].trim() })
  }
  return models
}

export function parseClaudeAuth(raw: string): AgentToolAuthAccount | undefined {
  const json = parseJsonObject(raw)
  if (!json) return undefined
  return {
    loggedIn: Boolean(json.loggedIn),
    email: asString(json.email) ?? asString(json.accountEmail),
    authMethod: asString(json.authMethod) === "none" ? undefined : asString(json.authMethod),
    organization:
      asString(json.organization) ??
      (asString(json.apiProvider) === "firstParty" ? "Anthropic" : asString(json.apiProvider)),
    accountName: asString(json.accountName) ?? asString(json.email) ?? "Claude Code",
    tier: asString(json.tier) ?? asString(json.subscriptionType)
  }
}

/** 从官方 JSON 抽用量百分比；0–1 当比例，>1 当百分数。没有字段就返回 undefined。 */
export function parseUsagePercent(raw: unknown): number | undefined {
  const json = asRecord(raw)
  if (!json) return undefined
  for (const key of ["rateLimit", "usage", "quota"] as const) {
    const child = json[key]
    if (!child || child === raw) continue
    const nested = parseUsagePercent(child)
    if (nested != null) return nested
  }
  const direct =
    asNumber(json.usedPercent) ??
    asNumber(json.utilization) ??
    asNumber(json.fiveHourUtilization) ??
    asNumber(json.percentage)
  if (direct != null) return clampPercent(direct > 0 && direct <= 1 ? direct * 100 : direct)
  const used = asNumber(json.used) ?? asNumber(json.usedTokens)
  const limit = asNumber(json.limit) ?? asNumber(json.limitTokens)
  if (used != null && limit && limit > 0) return clampPercent((used / limit) * 100)
  const remaining = asNumber(json.remaining) ?? asNumber(json.rateLimitRemaining)
  const cap = asNumber(json.rateLimitLimit)
  if (remaining != null && cap && cap > 0) return clampPercent(((cap - remaining) / cap) * 100)
  return undefined
}

export function quotaFromPercent(
  percent: number | undefined,
  windowType: string,
  details?: string,
  name = "default"
): AgentToolQuotaInfo | undefined {
  if (percent == null) return undefined
  return {
    hasQuota: true,
    usedPercent: percent,
    windowType,
    details,
    modelQuotas: [
      { name, displayName: windowType, percentage: percent, resetsIn: null, resetTime: null }
    ]
  }
}

export function parseCodexDoctor(raw: string): {
  customProvider: boolean
  cliVersion?: string
} {
  const json = parseJsonObject(raw)
  const checks = asRecord(json?.checks)
  const auth = asRecord(checks?.["auth.credentials"])
  const details = asRecord(auth?.details)
  const requires = asString(details?.["model provider requires OpenAI auth"])
  return {
    customProvider: requires === "false",
    cliVersion: asString(json?.codexVersion)
  }
}

export function parseCodexLogin(raw: string): AgentToolAuthAccount {
  const text = raw.trim()
  const lower = text.toLowerCase()
  if (!text || lower.includes("not logged in")) {
    return { loggedIn: false, authMethod: "codex login", organization: "OpenAI" }
  }
  const email = text.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0]
  const tier = text.match(/\b(plus|pro|team|enterprise|free)\b/i)?.[1]
  return {
    loggedIn: true,
    email,
    accountName: email ?? firstLine(text),
    tier: tier ? tier.toUpperCase() : undefined,
    authMethod: "codex login",
    organization: "OpenAI",
    rawStatus: firstLine(text).slice(0, 400)
  }
}

export function parseGrokModels(raw: string): {
  authAccount: AgentToolAuthAccount
  models: AgentCliModel[]
} {
  const loggedIn = !/not authenticated/i.test(raw)
  const models: AgentCliModel[] = []
  const seen = new Set<string>()
  for (const line of raw.split(/\r?\n/)) {
    const match = line.trim().match(/^[*+-]\s+([a-zA-Z0-9._:-]+)(?:\s+\(([^)]+)\))?/)
    if (!match?.[1] || seen.has(match[1])) continue
    seen.add(match[1])
    const note = match[2]?.trim()
    models.push({ id: match[1], label: note && note !== "default" ? `${match[1]} (${note})` : match[1] })
  }
  return {
    authAccount: {
      loggedIn,
      authMethod: "grok login",
      organization: "xAI",
      accountName: "Grok Build"
    },
    models
  }
}

export function parseGrokInspect(raw: string): Pick<AgentToolAuthAccount, "cliVersion"> {
  const json = parseJsonObject(raw)
  return { cliVersion: asString(json?.grokVersion) }
}

export function parseAgyModels(raw: string): AgentCliModel[] {
  const models: AgentCliModel[] = []
  const seen = new Set<string>()
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("Fetching")) continue
    const [id, ...rest] = trimmed.split(/\t+/)
    if (!id || seen.has(id)) continue
    seen.add(id)
    models.push({ id, label: rest.join(" ").trim() || id })
  }
  return models
}

export function countdownFrom(resetTime?: string | null): string | null {
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

export function modelQuotasFromUnknown(raw: unknown): ModelQuotaItem[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const items: ModelQuotaItem[] = []
  for (const entry of raw) {
    const rec = asRecord(entry)
    if (!rec) continue
    const name = asString(rec.name)
    if (!name || seen.has(name)) continue
    seen.add(name)
    const resetTime = asString(rec.reset_time) ?? asString(rec.resetTime) ?? null
    items.push({
      name,
      displayName: asString(rec.display_name) ?? asString(rec.displayName) ?? name,
      percentage: typeof rec.percentage === "number" ? rec.percentage : 0,
      resetsIn: countdownFrom(resetTime),
      resetTime
    })
  }
  return items
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}
