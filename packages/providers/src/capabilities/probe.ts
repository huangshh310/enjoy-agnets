/**
 * 动态能力：probe 成功后按模型 id 缓存 probedCaps。未探测仍用静态目录。
 */
import type { ProviderCapability } from "@enjoy-agents/ipc-contract"
import { staticCapabilitiesFor } from "./catalog.ts"

type ProbeEntry = {
  caps: ProviderCapability[]
  probedAt: number
}

const cache = new Map<string, ProbeEntry>()

export function probeCacheKey(kind: string, modelId: string): string {
  return `${kind}:${modelId}`
}

export function rememberProbedModels(kind: string, modelIds: string[], at = Date.now()): void {
  for (const modelId of modelIds) {
    cache.set(probeCacheKey(kind, modelId), {
      caps: staticCapabilitiesFor(modelId, kind),
      probedAt: at
    })
  }
}

export function probedCapabilitiesFor(
  modelId: string,
  kind: string
): {
  staticCaps: ProviderCapability[]
  probedCaps: ProviderCapability[]
  probedAt?: number
} {
  const staticCaps = staticCapabilitiesFor(modelId, kind)
  const hit = cache.get(probeCacheKey(kind, modelId))
  return {
    staticCaps,
    probedCaps: hit?.caps ?? [],
    probedAt: hit?.probedAt
  }
}

export function effectiveCapabilities(modelId: string, kind: string): ProviderCapability[] {
  const { staticCaps, probedCaps } = probedCapabilitiesFor(modelId, kind)
  return probedCaps.length > 0 ? probedCaps : staticCaps
}

export function clearProbedCapabilities(): void {
  cache.clear()
}
