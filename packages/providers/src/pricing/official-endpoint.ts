/**
 * 只有能确定是单一官方按量价的端点才套快照。
 * 有国内/国际两份价，或按量/套餐两套主机的 kind，整类不当官方（用户自填单价除外）。
 * 不要用 officialSiblingEndpoints：它会把套餐 region 也当成官方。
 */
import { presetFor, normalizeBaseURL } from "../presets.ts"
import { isProviderKind } from "../presets/kinds.ts"
import type { ProviderPreset } from "../presets/define.ts"
import { kindHasPlanRegions, uniqueCatalogForKind } from "./models-dev-kind.ts"
import { userRatesToModelRate } from "./user-rates.ts"
import type { UserModelRates } from "./types.ts"

export function hasUserRates(user?: UserModelRates): boolean {
  return Object.values(userRatesToModelRate(user)).some((value) => value !== undefined)
}

export function isOfficialProviderEndpoint(kind: string, baseURL?: string): boolean {
  return resolveOfficialCatalog(kind, baseURL).official
}

export function resolveSnapshotCatalog(kind: string, baseURL?: string): string | undefined {
  const resolved = resolveOfficialCatalog(kind, baseURL)
  return resolved.official ? resolved.catalog : undefined
}

export function resolveOfficialCatalog(
  kind: string,
  baseURL?: string
): { official: boolean; catalog?: string } {
  if (!kind || kind === "custom" || !isProviderKind(kind)) return { official: false }
  if (!kindAllowsSnapshot(kind)) return { official: false }
  const catalog = uniqueCatalogForKind(kind)
  if (!catalog) return { official: false }
  const url = baseURL?.trim()
  if (!url) return { official: true, catalog }
  if (!isSinglePaygUrl(presetFor(kind), url)) return { official: false }
  return { official: true, catalog }
}

export function kindAllowsSnapshot(kind: string): boolean {
  if (kindHasPlanRegions(kind)) return false
  const preset = presetFor(kind)
  if ((preset.regions?.length ?? 0) > 1) return false
  return uniqueCatalogForKind(kind) != null
}

function isSinglePaygUrl(preset: ProviderPreset, baseURL: string): boolean {
  const url = normalizeBaseURL(baseURL)
  const endpoints = preset.regions?.length === 1 ? preset.regions[0].endpoints : preset.endpoints
  if (Object.values(endpoints).some((value) => value && normalizeBaseURL(value) === url)) return true
  return normalizeBaseURL(preset.defaultBaseURL) === url
}
