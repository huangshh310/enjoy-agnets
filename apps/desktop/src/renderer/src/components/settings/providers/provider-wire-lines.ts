/**
 * 已配置行上的协议线：短名配上能区分路径的主机。
 * 没有 endpoints 的旧档案退回 apiStyle + baseURL。
 */
import type { ProviderPublic } from "@enjoy-agents/ipc-contract"
import { isApiStyle, type ApiStyle } from "@enjoy-agents/providers/presets"

export const WIRE_LABEL = {
  openai: "styleChat",
  "openai-responses": "styleResponses",
  anthropic: "styleMessages"
} as const

export type WireLine = { style: ApiStyle; host: string; url: string }

const WIRE_ORDER = ["openai", "openai-responses", "anthropic"] as const

/** 已填写的协议。空 endpoints 时用派生 apiStyle，避免旧档案一行空白。 */
export function wireStylesOf(profile: ProviderPublic): ApiStyle[] {
  const filled = WIRE_ORDER.filter((style) => Boolean(profile.endpoints?.[style]?.trim()))
  if (filled.length > 0) return [...filled]
  return isApiStyle(profile.apiStyle) ? [profile.apiStyle] : []
}

/** 每条已填的线一条。单线旧档案用 baseURL 补主机。 */
export function wireLinesOf(profile: ProviderPublic): WireLine[] {
  const styles = wireStylesOf(profile)
  return styles.flatMap((style) => {
    const url = profile.endpoints?.[style]?.trim() || (styles.length === 1 ? profile.baseURL.trim() : "")
    if (!url) return []
    return [{ style, url, host: wireHost(url) }]
  })
}

/** 主机加上有区分度的路径。只剩 /v1 时不重复路径。 */
export function wireHost(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/\/+$/, "")
    if (!path || path === "/v1") return parsed.host
    return `${parsed.host}${path}`
  } catch {
    return url
  }
}
