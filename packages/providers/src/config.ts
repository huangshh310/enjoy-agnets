/**
 * 供应商连接参数：Base URL 归一化、自定义 Header 解析。
 */
import { normalizeBaseURL, presetFor, type ProviderKind } from "./presets"

export function resolvedBaseURL(config: { provider: ProviderKind; baseURL?: string }): string {
  const fallback = presetFor(config.provider).defaultBaseURL
  return normalizeBaseURL(config.baseURL || fallback)
}

export function parseHeaders(raw?: Record<string, string> | string): Record<string, string> | undefined {
  if (!raw) return undefined
  if (typeof raw === "object") return raw
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as Record<string, string>
  } catch {
    // 自定义 Header 非法时忽略，避免整次建连失败
  }
  return undefined
}
