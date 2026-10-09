/**
 * 只有核对过的官方按量端点才套快照价。
 * 套餐 / 订阅主机、共享到多个 region 的 URL、对不上的地域，一律不当官方。
 * 不要用 officialSiblingEndpoints：它会把同一 preset 下的套餐 region 也当成官方。
 */
import { presetFor, normalizeBaseURL } from "../presets.ts"
import { isProviderKind } from "../presets/kinds.ts"
import type { PresetRegion, ProviderPreset } from "../presets/define.ts"
import {
  catalogForRegion,
  kindNeedsExplicitRegion,
  uniqueCatalogForKind
} from "./models-dev-kind.ts"
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
  const preset = presetFor(kind)
  const url = baseURL?.trim()
  if (!url) {
    if (kindNeedsExplicitRegion(kind)) return { official: false }
    const catalog = uniqueCatalogForKind(kind)
    return catalog ? { official: true, catalog } : { official: false }
  }
  const hits = matchingRegions(preset, url)
  if (hits.length === 0) return { official: false }
  const catalogs = new Set(hits.map((region) => catalogForRegion(kind, region.id)))
  if (catalogs.size !== 1) return { official: false }
  const catalog = [...catalogs][0]
  if (!catalog) return { official: false }
  return { official: true, catalog }
}

function matchingRegions(preset: ProviderPreset, baseURL: string): PresetRegion[] {
  const url = normalizeBaseURL(baseURL)
  const regions = preset.regions?.length
    ? preset.regions
    : [{ id: "default", name: "Default", endpoints: preset.endpoints }]
  return regions.filter((region) =>
    Object.values(region.endpoints).some((value) => value && normalizeBaseURL(value) === url)
  )
}
