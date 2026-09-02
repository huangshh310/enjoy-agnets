/**
 * AI Gateway 公开模型目录：启动拉一次，缓存 context_window。
 * LanguageModel 没有窗口字段；REST /v1/models 才有。无需鉴权。
 */
import {
  lookupGatewayContextWindow,
  parseCatalogContextWindow,
  parseCatalogMaxOutput
} from "./context-window.ts"

export const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models"
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export type GatewayCatalogEntry = {
  id: string
  contextWindow?: number
  maxOutputTokens?: number
}

type CatalogCache = {
  fetchedAt: number
  entries: GatewayCatalogEntry[]
}

let cache: CatalogCache | null = null
let inflight: Promise<GatewayCatalogEntry[]> | null = null

/** 读取缓存或拉取 Gateway 目录；失败返回空数组，不阻断 models.list。 */
export async function loadGatewayCatalog(now = Date.now()): Promise<GatewayCatalogEntry[]> {
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.entries
  if (inflight) return inflight
  inflight = fetchGatewayCatalog()
    .then((entries) => {
      cache = { fetchedAt: Date.now(), entries }
      return entries
    })
    .catch(() => cache?.entries ?? [])
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** 用已缓存或刚拉取的目录解析某模型窗口。 */
export async function gatewayContextWindowFor(
  modelId: string,
  provider?: string
): Promise<number | undefined> {
  const entries = await loadGatewayCatalog()
  return lookupGatewayContextWindow(entries, modelId, provider)
}

async function fetchGatewayCatalog(): Promise<GatewayCatalogEntry[]> {
  const response = await fetch(GATEWAY_MODELS_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000)
  })
  if (!response.ok) throw new Error(`Gateway catalog HTTP ${response.status}`)
  const body = (await response.json()) as { data?: unknown[] }
  return (body.data ?? [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      contextWindow: parseCatalogContextWindow(item),
      maxOutputTokens: parseCatalogMaxOutput(item)
    }))
    .filter((entry) => entry.id.length > 0)
}
