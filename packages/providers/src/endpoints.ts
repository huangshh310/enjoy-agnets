/**
 * 一条档案上的三条线协议：选 URL、选 Key、把用户粘贴的整段地址收成根。
 * 不做协议互译。Google 官方主机仍由 createGoogle 处理，不走这里的顺序。
 */
import type { ApiStyle } from "./api-styles.ts"

export type ProviderEndpoints = {
  openai?: string
  anthropic?: string
  "openai-responses"?: string
}

export type ProviderKeyRecord = {
  id: string
  name?: string
  apiKey: string
  apiStyle?: string
  enabled?: boolean
}

const STYLE_ORDER: readonly ApiStyle[] = ["openai", "openai-responses", "anthropic"]

const API_STYLES: readonly ApiStyle[] = ["openai", "anthropic", "openai-responses"]

/** 去掉空串，避免「填了又清空」仍被当成有这条协议。 */
export function cleanEndpoints(endpoints: ProviderEndpoints | undefined): ProviderEndpoints {
  const out: ProviderEndpoints = {}
  for (const style of API_STYLES) {
    const value = endpoints?.[style]?.trim().replace(/\/+$/, "")
    if (value) out[style] = value
  }
  return out
}

export function filledStyles(endpoints: ProviderEndpoints | undefined): ApiStyle[] {
  const cleaned = cleanEndpoints(endpoints)
  return API_STYLES.filter((style) => Boolean(cleaned[style]))
}

/** 空字符串当没有。 */
export function endpointFor(endpoints: ProviderEndpoints | undefined, style: ApiStyle): string {
  return cleanEndpoints(endpoints)[style] ?? ""
}

/**
 * Enjoy Local 对话用哪条线。
 * 先尊重 preferred（通常是 baseAPI），否则 Chat，再 Responses，再 Messages。
 */
export function speakStyle(endpoints: ProviderEndpoints | undefined, preferred?: ApiStyle): ApiStyle {
  if (preferred && endpointFor(endpoints, preferred)) return preferred
  for (const style of STYLE_ORDER) {
    if (endpointFor(endpoints, style)) return style
  }
  return preferred && isStyle(preferred) ? preferred : "openai"
}

export function keysFor(profile: {
  apiKey?: string
  keys?: readonly ProviderKeyRecord[]
}, style: ApiStyle): string[] {
  const keys = profile.keys ?? []
  const listed = keys.filter((key) => {
    if (key.enabled === false) return false
    if (!key.apiKey.trim()) return false
    return !key.apiStyle || key.apiStyle === style
  })
  if (listed.length > 0) return listed.map((key) => key.apiKey.trim())
  // 已经有 Key 列表但没有一把对得上时，不要退回另一条协议的派生 Key。
  if (keys.length > 0) return []
  const fallback = profile.apiKey?.trim()
  return fallback ? [fallback] : []
}

/** 没有匹配 Key 时抛给人话，调用方不要吞掉。 */
export function keyFor(profile: {
  apiKey?: string
  keys?: readonly ProviderKeyRecord[]
}, style: ApiStyle): string {
  const keys = keysFor(profile, style)
  const first = keys[0]
  if (!first) throw new Error(`Add an API key for the ${style} endpoint.`)
  return first
}

/**
 * 对齐 Magpie DetectBase：剥掉用户粘贴的完整路径。
 * Anthropic 再去掉末尾 /v1（客户端自己加 /v1/messages）。
 * Chat / Responses 在主机没有路径时补 /v1。
 */
export function detectBase(raw: string, style: ApiStyle): string {
  let url = raw.trim().replace(/\/+$/, "")
  if (!url) return ""
  const suffixes = ["/chat/completions", "/responses", "/v1/messages", "/messages"]
  for (const suffix of suffixes) {
    if (url.endsWith(suffix)) url = url.slice(0, -suffix.length).replace(/\/+$/, "")
  }
  if (!url) return ""
  if (style === "anthropic") {
    if (url.endsWith("/v1")) url = url.slice(0, -3).replace(/\/+$/, "")
    return url
  }
  try {
    const parsed = new URL(url)
    if (parsed.pathname === "" || parsed.pathname === "/") return `${url}/v1`
  } catch {
    return url
  }
  return url
}

/** 拉 /models 的地址。modelsURL 优先，否则 Chat，再 Responses，再去掉 Anthropic 根上的 /anthropic。 */
export function catalogRequestURL(profile: {
  modelsURL?: string
  endpoints?: ProviderEndpoints
  baseURL?: string
}): string {
  const override = profile.modelsURL?.trim()
  if (override) return override.replace(/\/+$/, "")
  const chat = endpointFor(profile.endpoints, "openai")
  if (chat) return chat
  const responses = endpointFor(profile.endpoints, "openai-responses")
  if (responses) return responses
  const anthropic = endpointFor(profile.endpoints, "anthropic")
  if (anthropic) return anthropic.replace(/\/anthropic$/, "")
  return profile.baseURL?.trim().replace(/\/+$/, "") ?? ""
}

export function firstEndpoint(endpoints: ProviderEndpoints | undefined): string {
  const cleaned = cleanEndpoints(endpoints)
  for (const style of STYLE_ORDER) {
    if (cleaned[style]) return cleaned[style]
  }
  return cleaned.anthropic ?? ""
}

/** 派生 baseURL：baseAPI 那条，没有则第一条有值的端点。 */
export function derivedBaseURL(endpoints: ProviderEndpoints | undefined, baseAPI: ApiStyle): string {
  return endpointFor(endpoints, baseAPI) || firstEndpoint(endpoints)
}

/** 派生 apiKey：第一把启用且未锁协议的 Key，否则第一把对该协议启用的 Key。 */
export function derivedApiKey(profile: {
  apiKey?: string
  keys?: readonly ProviderKeyRecord[]
}, baseAPI: ApiStyle): string {
  const unlocked = (profile.keys ?? []).find((key) => key.enabled !== false && key.apiKey.trim() && !key.apiStyle)
  if (unlocked) return unlocked.apiKey.trim()
  return keysFor(profile, baseAPI)[0] ?? ""
}

function isStyle(value: string): value is ApiStyle {
  return (API_STYLES as readonly string[]).includes(value)
}
