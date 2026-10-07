/**
 * 把预设草稿收成运行时要用的形状。
 * defaultBaseURL / baseURLForStyle 是派生字段，旧调用点继续读它们。
 */
import type { ApiStyle } from "../api-styles.ts"
import { isApiStyle } from "../api-styles.ts"
import { cleanEndpoints, type ProviderEndpoints } from "../endpoints.ts"
import type { ProviderKind } from "./kinds.ts"

export type PresetGroup = "vendor" | "relay" | "local" | "media"
export type CatalogSource = "preset" | "remote" | "manual"

export type CatalogModel = {
  id: string
  label: string
  enabled?: boolean
  source?: CatalogSource
  contextWindow?: number
  maxOutputTokens?: number
}

export type PresetRegion = {
  id: string
  name: string
  endpoints: ProviderEndpoints
  modelsURL?: string
  docsURL?: string
  keysURL?: string
}

export type PresetDraft = {
  kind: ProviderKind
  name: string
  description: string
  group: PresetGroup
  endpoints: ProviderEndpoints
  regions?: PresetRegion[]
  /** UI 翻译键：region 或 plan。 */
  regionLabel?: "region" | "plan"
  apiStyle: ApiStyle
  requiresKey: boolean
  docsURL?: string
  keysURL?: string
  headerHints?: string[]
  models: CatalogModel[]
  noModelsList?: boolean
  /** 端点为空时仍要让筛选认这三条协议，例如自定义。 */
  supportedApiStyles?: readonly ApiStyle[]
}

export type ProviderPreset = PresetDraft & {
  defaultBaseURL: string
  supportedApiStyles: readonly ApiStyle[]
  baseURLForStyle: Partial<Record<ApiStyle, string>>
}

export function presetModel(id: string, label: string): CatalogModel {
  return { id, label, enabled: true, source: "preset" }
}

export function definePreset(draft: PresetDraft): ProviderPreset {
  const endpoints = cleanEndpoints(draft.endpoints)
  const styles = (["openai", "anthropic", "openai-responses"] as const).filter((style) => endpoints[style])
  const supported = draft.supportedApiStyles?.length ? draft.supportedApiStyles : styles.length ? styles : [draft.apiStyle]
  const baseURLForStyle: Partial<Record<ApiStyle, string>> = {}
  for (const style of supported) {
    const url = endpoints[style]
    if (url) baseURLForStyle[style] = url
  }
  return {
    ...draft,
    endpoints,
    regions: draft.regions?.map((region) => ({ ...region, endpoints: cleanEndpoints(region.endpoints) })),
    models: draft.models.map((model) => ({
      ...model,
      enabled: model.enabled !== false,
      source: model.source ?? "preset"
    })),
    defaultBaseURL: endpoints[draft.apiStyle] || endpoints.openai || endpoints["openai-responses"] || endpoints.anthropic || "",
    supportedApiStyles: supported,
    baseURLForStyle
  }
}

/** 新建或切区域时用的官方端点。regionId 对不上就用默认区域。 */
export function endpointsFor(preset: ProviderPreset, regionId?: string): ProviderEndpoints {
  if (regionId) {
    const region = preset.regions?.find((item) => item.id === regionId)
    if (region) return { ...region.endpoints }
  }
  return { ...preset.endpoints }
}

export function defaultBaseURLFor(preset: ProviderPreset, style?: ApiStyle): string {
  if (style && preset.endpoints[style]) return preset.endpoints[style]
  if (style && preset.baseURLForStyle[style]) return preset.baseURLForStyle[style]
  return preset.defaultBaseURL
}

export function supportedApiStylesFor(preset: ProviderPreset): readonly ApiStyle[] {
  return preset.supportedApiStyles
}

/**
 * 保存的 URL 等于某区域里任意一条官方地址时，返回该区域全部端点。
 * 区域按数组顺序，共享 URL（智谱两条套餐的 Anthropic）命中先写的那条。
 */
export function officialSiblingEndpoints(preset: ProviderPreset, baseURL: string): ProviderEndpoints | undefined {
  const url = normalize(baseURL)
  if (!url) return undefined
  const regions = preset.regions?.length
    ? preset.regions
    : [{ id: "default", name: "Default", endpoints: preset.endpoints }]
  for (const region of regions) {
    const endpoints = cleanEndpoints(region.endpoints)
    if (Object.values(endpoints).some((value) => value === url)) return endpoints
  }
  return undefined
}

export function pickApiStyle(value: string | undefined, fallback: ApiStyle): ApiStyle {
  return isApiStyle(value) ? value : fallback
}

function normalize(value: string): string {
  return value.trim().replace(/\/+$/, "")
}
