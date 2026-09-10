/**
 * 模型目录地址：控制台网页不能当 Base URL。
 * 官方主机按路径认协议——DeepSeek `/anthropic` 是 Messages（与 cc-switch Claude 预设一致），
 * `/v1` 是 Chat Completions。拉 /models 会剥兼容子路径，但档案 Base URL 不能被目录候选覆盖。
 */
import type { ApiStyle } from "./api-styles.ts"

export type CatalogErrorCode = "catalogConsoleProtocol" | "catalogProtocol" | "catalogHtml"

export type CatalogAdvice =
  | { action: "ok" }
  | { action: "rewrite"; rewriteTo: string }
  | { action: "reject"; code: CatalogErrorCode; vars: Record<string, string> }

type KnownSite = {
  brand: string
  nativeStyle: ApiStyle
  apiURL: string
  /** 官方 Anthropic Messages 兼容入口；缺省表示该主机没有这条线 */
  anthropicURL?: string
  consoleHosts: string[]
  apiHosts: string[]
}

const SITES: KnownSite[] = [
  {
    brand: "DeepSeek",
    nativeStyle: "openai",
    apiURL: "https://api.deepseek.com/v1",
    anthropicURL: "https://api.deepseek.com/anthropic",
    consoleHosts: [
      "platform.deepseek.com",
      "chat.deepseek.com",
      "deepseek.com",
      "api-docs.deepseek.com"
    ],
    apiHosts: ["api.deepseek.com"]
  },
  {
    brand: "OpenAI",
    nativeStyle: "openai",
    apiURL: "https://api.openai.com/v1",
    consoleHosts: ["platform.openai.com", "chatgpt.com"],
    apiHosts: ["api.openai.com"]
  },
  {
    brand: "Anthropic",
    nativeStyle: "anthropic",
    apiURL: "https://api.anthropic.com",
    consoleHosts: ["console.anthropic.com", "docs.anthropic.com", "claude.ai"],
    apiHosts: ["api.anthropic.com"]
  }
]

export class CatalogError extends Error {
  readonly code: CatalogErrorCode
  readonly vars: Record<string, string>

  constructor(code: CatalogErrorCode, vars: Record<string, string> = {}, fallback?: string) {
    super(fallback ?? fallbackMessage(code, vars))
    this.name = "CatalogError"
    this.code = code
    this.vars = vars
  }
}

/** 控制台网页直接拒或改成 API，避免把 HTML 首页当成 /models。 */
export function resolveCatalogBaseURL(raw: string, apiStyle: ApiStyle): string {
  const baseURL = raw.trim().replace(/\/+$/, "")
  const advice = adviseCatalogUrl(baseURL, apiStyle)
  if (advice.action === "reject") throw new CatalogError(advice.code, advice.vars)
  if (advice.action === "rewrite") return advice.rewriteTo
  return baseURL
}

/**
 * 拉模型前先看地址：控制台改写成对应协议的官方入口；
 * `/anthropic` 是 Messages，不要只凭主机名判 Chat Completions。
 */
export function adviseCatalogUrl(baseURL: string, apiStyle: ApiStyle): CatalogAdvice {
  const parsed = parseCatalogUrl(baseURL)
  if (!parsed) return { action: "ok" }
  const hit = matchSite(parsed.host)
  if (!hit) return { action: "ok" }
  const vars = siteVars(hit.site, parsed.host, apiStyle)
  if (hit.kind === "console") return adviseConsole(hit.site, apiStyle, vars)
  return adviseApiHost(hit.site, parsed.path, apiStyle, vars)
}

export function htmlCatalogError(apiStyle: ApiStyle): CatalogError {
  return new CatalogError("catalogHtml", { official: officialFor(apiStyle) })
}

/**
 * 拉 /models 的基址候选。DeepSeek 等把 Messages 挂在 /anthropic，
 * 目录却在根上（cc-switch `modelsUrl: https://api.deepseek.com/models`）。
 */
export function catalogBaseCandidates(baseURL: string): string[] {
  const trimmed = baseURL.trim().replace(/\/+$/, "")
  if (!trimmed) return []
  const out: string[] = []
  const add = (url: string) => {
    if (url && !out.includes(url)) out.push(url)
  }
  add(trimmed)
  if (!hasVersionRoot(trimmed)) add(`${trimmed}/v1`)
  const stripped = stripAnthropicCompat(trimmed)
  if (stripped) {
    add(`${stripped}/v1`)
    add(stripped)
  }
  return out
}

/** 剥兼容子路径找到的 /models 只用于目录，不能把 Messages 基址改成 Chat 根。 */
export function catalogPersistBase(requested: string, candidate: string): string {
  const req = requested.trim().replace(/\/+$/, "")
  const hit = candidate.trim().replace(/\/+$/, "")
  if (isAnthropicCompatBase(req)) return req
  if (hit === req || hit === `${req}/v1`) return hit
  return req
}

function adviseConsole(
  site: KnownSite,
  apiStyle: ApiStyle,
  vars: Record<string, string>
): CatalogAdvice {
  const rewriteTo = officialUrlForStyle(site, apiStyle)
  if (rewriteTo) return { action: "rewrite", rewriteTo }
  return { action: "reject", code: "catalogConsoleProtocol", vars }
}

function adviseApiHost(
  site: KnownSite,
  path: string,
  apiStyle: ApiStyle,
  vars: Record<string, string>
): CatalogAdvice {
  if (apiStyle === "anthropic" && isAnthropicCompatPath(path)) return { action: "ok" }
  if (styleFits(site, apiStyle)) {
    if (isAnthropicCompatPath(path) && isChatStyle(apiStyle)) {
      return { action: "rewrite", rewriteTo: site.apiURL }
    }
    return { action: "ok" }
  }
  const rewriteTo = officialUrlForStyle(site, apiStyle)
  if (rewriteTo) return { action: "rewrite", rewriteTo }
  return { action: "reject", code: "catalogProtocol", vars }
}

function matchSite(host: string): { site: KnownSite; kind: "console" | "api" } | null {
  for (const site of SITES) {
    if (site.consoleHosts.includes(host)) return { site, kind: "console" }
    if (site.apiHosts.includes(host)) return { site, kind: "api" }
  }
  return null
}

function styleFits(site: KnownSite, apiStyle: ApiStyle): boolean {
  if (site.nativeStyle === "openai") return isChatStyle(apiStyle)
  return apiStyle === site.nativeStyle
}

function isChatStyle(apiStyle: ApiStyle): boolean {
  return apiStyle === "openai" || apiStyle === "openai-responses"
}

function officialUrlForStyle(site: KnownSite, apiStyle: ApiStyle): string | null {
  if (apiStyle === "anthropic") {
    if (site.nativeStyle === "anthropic") return site.apiURL
    return site.anthropicURL ?? null
  }
  if (isChatStyle(apiStyle) && site.nativeStyle === "openai") return site.apiURL
  return null
}

function siteVars(site: KnownSite, host: string, apiStyle: ApiStyle): Record<string, string> {
  return {
    brand: site.brand,
    host,
    official: officialFor(apiStyle),
    altUrl: site.anthropicURL && apiStyle === "anthropic" ? site.anthropicURL : site.apiURL
  }
}

function officialFor(apiStyle: ApiStyle): string {
  return apiStyle === "anthropic" ? "https://api.anthropic.com" : "https://api.openai.com/v1"
}

function parseCatalogUrl(baseURL: string): { host: string; path: string } | null {
  const raw = baseURL.trim()
  if (!raw) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
    return {
      host: url.hostname.replace(/^www\./i, "").toLowerCase(),
      path: url.pathname.replace(/\/+$/, "").toLowerCase() || "/"
    }
  } catch {
    return null
  }
}

/** `/anthropic`、`/api/anthropic` 及带 `/v1` 的变体都是 Messages 兼容层。 */
function isAnthropicCompatPath(path: string): boolean {
  return /(?:^|\/)(?:api\/)?anthropic(?:\/v1)?$/.test(path.replace(/\/+$/, "").toLowerCase())
}

function isAnthropicCompatBase(baseURL: string): boolean {
  const parsed = parseCatalogUrl(baseURL)
  if (parsed) return isAnthropicCompatPath(parsed.path)
  return /\/(?:api\/)?anthropic(?:\/v1)?$/i.test(baseURL.trim().replace(/\/+$/, ""))
}

function stripAnthropicCompat(baseURL: string): string | null {
  const trimmed = baseURL.replace(/\/+$/, "")
  const next = trimmed.replace(/\/(?:api\/)?anthropic(?:\/v1)?$/i, "")
  return next === trimmed ? null : next
}

function hasVersionRoot(baseURL: string): boolean {
  return /\/v1(?:beta)?(?:\/openai)?$/i.test(baseURL)
}

function fallbackMessage(code: CatalogErrorCode, vars: Record<string, string>): string {
  if (code === "catalogConsoleProtocol") {
    return `${vars.host} is the ${vars.brand} console, not a models API. Anthropic Messages needs ${vars.official}. To use ${vars.brand}, switch to Chat Completions and ${vars.altUrl}.`
  }
  if (code === "catalogProtocol") {
    return `${vars.host} is ${vars.brand}'s API, not Anthropic Messages. Use ${vars.official} for Claude.`
  }
  return "This URL returned a web page, not the models API. Check the base URL and protocol."
}
