/**
 * 按协议拉模型目录。站点根常返回 HTML，会补 /v1；`/anthropic` 会剥到根上打 /models。
 * 成功候选若只是剥兼容路径，不得写回档案 Base URL。Anthropic 走 x-api-key。
 */
import type { ApiStyle } from "./api-styles.ts"
import {
  catalogBaseCandidates,
  catalogPersistBase,
  htmlCatalogError,
  resolveCatalogBaseURL
} from "./catalog-url.ts"
import { parseCatalogContextWindow, parseCatalogMaxOutput } from "./context-window.ts"
import { normalizeBaseURL, presetFor, type CatalogModel, type ProviderKind } from "./presets.ts"

export type DiscoverResult = {
  models: CatalogModel[]
  resolvedBaseURL: string
}

export async function discoverRemoteModels(config: {
  provider: ProviderKind
  apiKey: string
  baseURL: string
  apiStyle?: ApiStyle
}): Promise<DiscoverResult> {
  const preset = presetFor(config.provider)
  const apiStyle = config.apiStyle ?? preset.apiStyle
  const baseURL = resolveCatalogBaseURL(config.baseURL, apiStyle)

  if (config.provider === "ollama") {
    return { models: await fetchOllamaModels(baseURL, bearerHeaders(config.apiKey)), resolvedBaseURL: baseURL }
  }
  if (apiStyle === "anthropic") {
    return fetchAnthropicCatalog(baseURL, config.apiKey, apiStyle)
  }
  return fetchOpenAICatalog(baseURL, bearerHeaders(config.apiKey), apiStyle)
}

export type PingResult = {
  ok: boolean
  latencyMs: number
  message: string
}

/**
 * 测试与指定供应商端点的连通性与网络延迟 (Ping Speed Test)。
 */
export async function pingProviderEndpoint(config: {
  provider: ProviderKind
  apiKey?: string
  baseURL: string
  apiStyle?: ApiStyle
}): Promise<PingResult> {
  const preset = presetFor(config.provider)
  const apiStyle = config.apiStyle ?? preset.apiStyle
  const baseURL = normalizeBaseURL(config.baseURL || preset.defaultBaseURL)
  const apiKey = config.apiKey || (preset.requiresKey ? "" : "ollama")

  if (!baseURL) {
    return { ok: false, latencyMs: 0, message: "No Base URL configured." }
  }

  const start = performance.now()
  try {
    const headers: Record<string, string> = { Accept: "application/json" }
    if (apiKey) {
      if (apiStyle === "anthropic") {
        headers["x-api-key"] = apiKey
        headers["anthropic-version"] = "2023-06-01"
      } else {
        headers.Authorization = `Bearer ${apiKey}`
      }
    }

    const testUrl =
      config.provider === "ollama"
        ? `${baseURL.replace(/\/v1$/, "")}/api/tags`
        : `${baseURL}/models`

    const response = await fetch(testUrl, {
      method: "GET",
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(8_000)
    })

    const latencyMs = Math.round(performance.now() - start)

    if (response.ok) {
      return { ok: true, latencyMs, message: `Connected (${latencyMs}ms)` }
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: true, latencyMs, message: `Reachable (${latencyMs}ms, HTTP ${response.status})` }
    }
    return { ok: false, latencyMs, message: `HTTP ${response.status} ${response.statusText}` }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start)
    const errText = error instanceof Error ? error.message : String(error)
    const message =
      errText.includes("timeout") || errText.includes("aborted")
        ? "Timeout (>8s)"
        : errText
    return { ok: false, latencyMs, message }
  }
}

function bearerHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  return headers
}

async function fetchOllamaModels(baseURL: string, headers: Record<string, string>) {
  const origin = baseURL.replace(/\/v1$/, "")
  const response = await fetch(`${origin}/api/tags`, { headers, signal: AbortSignal.timeout(12_000) })
  if (!response.ok) throw new Error(`Ollama returned ${response.status}.`)
  const body = await readJson<{ models?: Array<{ name?: string }> }>(response, "openai")
  return (body.models ?? [])
    .map((item) => item.name)
    .filter((name): name is string => Boolean(name))
    .map((name) => ({ id: name, label: name }))
}

async function fetchOpenAICatalog(
  baseURL: string,
  headers: Record<string, string>,
  apiStyle: ApiStyle
) {
  return tryCatalogBases(baseURL, (candidate) => fetchOpenAIModels(candidate, headers, apiStyle))
}

async function fetchAnthropicCatalog(baseURL: string, apiKey: string, apiStyle: ApiStyle) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "anthropic-version": "2023-06-01"
  }
  if (apiKey) {
    headers["x-api-key"] = apiKey
    headers.Authorization = `Bearer ${apiKey}`
  }
  return tryCatalogBases(baseURL, (candidate) => fetchAnthropicModels(candidate, headers, apiStyle))
}

async function tryCatalogBases(
  baseURL: string,
  load: (candidate: string) => Promise<CatalogModel[]>
): Promise<DiscoverResult> {
  let lastError: Error = new Error("Could not reach the models API.")
  for (const candidate of catalogBaseCandidates(baseURL)) {
    try {
      return {
        models: await load(candidate),
        resolvedBaseURL: catalogPersistBase(baseURL, candidate)
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }
  throw lastError
}

async function fetchOpenAIModels(
  baseURL: string,
  headers: Record<string, string>,
  apiStyle: ApiStyle
) {
  const body = await getJson<{ data?: Array<{ id?: string; name?: string; display_name?: string }> }>(
    `${baseURL}/models`,
    headers,
    apiStyle
  )
  return (body.data ?? [])
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, 100)
    .map((id) => {
      const item = body.data?.find((entry) => entry.id === id)
      const label = item?.name || item?.display_name || id
      return withCatalogWindow({ id, label }, item)
    })
}

async function fetchAnthropicModels(
  baseURL: string,
  headers: Record<string, string>,
  apiStyle: ApiStyle
) {
  const body = await getJson<{ data?: Array<{ id?: string; display_name?: string }> }>(
    `${baseURL}/models`,
    headers,
    apiStyle
  )
  return (body.data ?? [])
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, 80)
    .map((id) => {
      const item = body.data?.find((entry) => entry.id === id)
      return withCatalogWindow({ id, label: item?.display_name || id }, item)
    })
}

function withCatalogWindow(
  model: CatalogModel,
  raw: unknown
): CatalogModel {
  const contextWindow = parseCatalogContextWindow(raw)
  const maxOutputTokens = parseCatalogMaxOutput(raw)
  return {
    ...model,
    ...(contextWindow ? { contextWindow } : {}),
    ...(maxOutputTokens ? { maxOutputTokens } : {})
  }
}

async function getJson<T>(url: string, headers: Record<string, string>, apiStyle: ApiStyle): Promise<T> {
  const response = await fetch(url, {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(12_000)
  })
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`Provider redirected (${response.status}).`)
  }
  if (!response.ok) throw await httpCatalogError(response, apiStyle)
  return readJson<T>(response, apiStyle)
}

async function httpCatalogError(response: Response, apiStyle: ApiStyle): Promise<Error> {
  const text = await response.text()
  if (looksLikeHtml(text)) return htmlCatalogError(apiStyle)
  const detail = extractProviderError(text)
  if (response.status === 401 || response.status === 403) {
    return new Error(
      detail
        ? `Authentication failed (${response.status}): ${detail}`
        : `Authentication failed (${response.status}). Check the API key — this is not a proxy/network error.`
    )
  }
  if (response.status === 407) {
    return new Error("Proxy requires authentication (407). Check the system proxy user/password.")
  }
  return new Error(
    detail
      ? `Provider returned ${response.status}: ${detail}`
      : `Provider returned ${response.status} ${response.statusText}.`
  )
}

/** DeepSeek / OpenAI 等会在 JSON 里写 Authentication Fails，比裸 401 更有用。 */
function extractProviderError(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as Record<string, unknown>
    if (typeof body.error === "string" && body.error.trim()) return body.error.trim()
    if (body.error && typeof body.error === "object") {
      const errObj = body.error as { message?: string }
      if (typeof errObj.message === "string" && errObj.message.trim()) {
        return errObj.message.trim()
      }
    }
    if (typeof body.message === "string" && body.message.trim()) return body.message.trim()
  } catch {
    // 非 JSON 时只用状态码
  }
  return undefined
}

async function readJson<T>(response: Response, apiStyle: ApiStyle): Promise<T> {
  const text = await response.text()
  if (looksLikeHtml(text)) throw htmlCatalogError(apiStyle)
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error("Provider returned non-JSON. Check the base URL and protocol.")
  }
}

function looksLikeHtml(text: string): boolean {
  const start = text.trimStart().slice(0, 16).toLowerCase()
  return start.startsWith("<!doctype") || start.startsWith("<html") || start.startsWith("<")
}
