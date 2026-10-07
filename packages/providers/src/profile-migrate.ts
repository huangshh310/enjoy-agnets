/**
 * 旧档案（单 baseURL + 单 Key）读入时收成多端点档案，并重算派生字段。
 * 只在 URL 等于该预设某区域的官方地址时补兄弟端点。改过的中转地址不补。
 */
import type { ApiStyle } from "./api-styles.ts"
import { isApiStyle } from "./api-styles.ts"
import {
  cleanEndpoints,
  derivedApiKey,
  derivedBaseURL,
  type ProviderEndpoints,
  type ProviderKeyRecord
} from "./endpoints.ts"
import {
  officialSiblingEndpoints,
  pickApiStyle,
  presetFor,
  type CatalogModel,
  type CatalogSource
} from "./presets.ts"
import { isProviderKind, type ProviderKind } from "./presets/kinds.ts"

export type ReasoningFamilyName = "auto" | "minimax" | "glm" | "kimi" | "deepseek" | "default"

export type ProfileKey = {
  id: string
  name: string
  apiKey: string
  apiStyle?: ApiStyle
  enabled: boolean
}

export type NormalizedProfile = {
  id: string
  name: string
  kind: ProviderKind
  enabled: boolean
  endpoints: ProviderEndpoints
  baseAPI: ApiStyle
  regionId?: string
  keys: ProfileKey[]
  models?: CatalogModel[]
  modelsURL?: string
  modelId: string
  fastModelId?: string
  reasoningModelId?: string
  reasoningFamily: ReasoningFamilyName
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: "low" | "medium" | "high" | "xhigh"
  customHeaders?: string
  customBody?: string
  proxy?: string
  apiKey: string
  baseURL: string
  apiStyle: ApiStyle
}

type LooseModel = {
  id?: string
  label?: string
  enabled?: boolean
  source?: string
  contextWindow?: number
  maxOutputTokens?: number
}

type LooseKey = {
  id?: string
  name?: string
  apiKey?: string
  apiStyle?: string
  enabled?: boolean
}

export type LooseProfile = {
  id?: string
  name?: string
  kind?: string
  enabled?: boolean
  endpoints?: ProviderEndpoints
  baseAPI?: string
  regionId?: string
  keys?: LooseKey[]
  models?: LooseModel[]
  modelsURL?: string
  modelId?: string
  fastModelId?: string
  reasoningModelId?: string
  reasoningFamily?: string
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: NormalizedProfile["reasoningEffort"]
  customHeaders?: string
  customBody?: string
  proxy?: string
  apiKey?: string
  baseURL?: string
  apiStyle?: string
}

export type ProfileUpsertInput = Omit<LooseProfile, "contextWindow"> & {
  name: string
  kind: string
  contextWindow?: number | null
}

const FAMILIES: readonly ReasoningFamilyName[] = ["auto", "minimax", "glm", "kimi", "deepseek", "default"]

export function migrateStoredProfile(raw: LooseProfile): { profile: NormalizedProfile; changed: boolean } {
  const rawKind = raw.kind ?? ""
  const kind = isProviderKind(rawKind) ? rawKind : "custom"
  const preset = presetFor(kind)
  const style = pickApiStyle(raw.apiStyle, preset.apiStyle)
  let changed = !isProviderKind(raw.kind ?? "")
  const endpoints = endpointsFromLegacy(raw, preset, style, () => {
    changed = true
  })
  const baseAPI = pickApiStyle(raw.baseAPI, style)
  if (!isApiStyle(raw.baseAPI)) changed = true
  const keys = keysFromLegacy(raw, () => {
    changed = true
  })
  const models = modelsFromLegacy(raw, preset, () => {
    changed = true
  })
  if (raw.enabled === undefined || !isFamily(raw.reasoningFamily)) changed = true
  const profile = withDerived({
    id: raw.id?.trim() || "prv_legacy",
    name: raw.name?.trim() || preset.name,
    kind,
    enabled: raw.enabled !== false,
    endpoints,
    baseAPI,
    regionId: raw.regionId?.trim() || undefined,
    keys,
    models,
    modelsURL: raw.modelsURL?.trim() || undefined,
    modelId: raw.modelId?.trim() || preset.models[0]?.id || "",
    fastModelId: raw.fastModelId,
    reasoningModelId: raw.reasoningModelId,
    reasoningFamily: isFamily(raw.reasoningFamily) ? raw.reasoningFamily : "auto",
    contextWindow: raw.contextWindow,
    maxTokens: raw.maxTokens,
    temperature: raw.temperature,
    reasoningEffort: raw.reasoningEffort,
    customHeaders: raw.customHeaders,
    customBody: raw.customBody,
    proxy: raw.proxy,
    apiKey: "",
    baseURL: "",
    apiStyle: baseAPI
  })
  if (raw.apiKey !== profile.apiKey || (raw.baseURL ?? "") !== profile.baseURL || raw.apiStyle !== profile.apiStyle) {
    changed = true
  }
  if (!raw.id?.trim() || !raw.name?.trim()) changed = true
  return { profile, changed }
}

export function normalizeVault(vault: {
  activeId: string | null
  profiles: LooseProfile[]
}): { vault: { activeId: string | null; profiles: NormalizedProfile[] }; changed: boolean } {
  let changed = false
  const profiles = (vault.profiles ?? []).map((raw) => {
    const next = migrateStoredProfile(raw)
    if (next.changed) changed = true
    return next.profile
  })
  let activeId = vault.activeId
  const active = profiles.find((profile) => profile.id === activeId)
  if (active && !active.enabled) {
    activeId = profiles.find((profile) => profile.enabled)?.id ?? null
    changed = true
  }
  return { vault: { activeId, profiles }, changed }
}

export function withDerived(profile: NormalizedProfile): NormalizedProfile {
  return {
    ...profile,
    apiKey: derivedApiKey(profile, profile.baseAPI),
    baseURL: derivedBaseURL(profile.endpoints, profile.baseAPI),
    apiStyle: profile.baseAPI
  }
}

function endpointsFromLegacy(
  raw: LooseProfile,
  preset: ReturnType<typeof presetFor>,
  style: ApiStyle,
  mark: () => void
): ProviderEndpoints {
  if (raw.endpoints && typeof raw.endpoints === "object") {
    const cleaned = cleanEndpoints(raw.endpoints)
    if (JSON.stringify(cleaned) !== JSON.stringify(cleanRawEndpoints(raw.endpoints))) mark()
    return cleaned
  }
  mark()
  const saved = raw.baseURL?.trim() ?? ""
  if (!saved) return {}
  return officialSiblingEndpoints(preset, saved) ?? cleanEndpoints({ [style]: saved })
}

function cleanRawEndpoints(endpoints: ProviderEndpoints): ProviderEndpoints {
  const out: ProviderEndpoints = {}
  for (const style of ["openai", "anthropic", "openai-responses"] as const) {
    const value = endpoints[style]
    if (typeof value === "string") out[style] = value
  }
  return out
}

function keysFromLegacy(raw: LooseProfile, mark: () => void): ProfileKey[] {
  if (Array.isArray(raw.keys) && raw.keys.length > 0) {
    return raw.keys.map((key, index) => {
      if (!key.id?.trim() || key.enabled === undefined) mark()
      return {
        id: key.id?.trim() || `key-${index + 1}`,
        name: key.name?.trim() ?? "",
        apiKey: key.apiKey ?? "",
        apiStyle: isApiStyle(key.apiStyle) ? key.apiStyle : undefined,
        enabled: key.enabled !== false
      }
    })
  }
  mark()
  return [{ id: "primary", name: "", apiKey: raw.apiKey ?? "", enabled: true }]
}

function modelsFromLegacy(
  raw: LooseProfile,
  preset: ReturnType<typeof presetFor>,
  mark: () => void
): CatalogModel[] | undefined {
  if (!Array.isArray(raw.models)) return undefined
  const presetIds = new Set(preset.models.map((model) => model.id))
  return raw.models.filter((model) => model.id?.trim()).map((model) => {
    const source = knownSource(model.source) ?? (presetIds.has(model.id ?? "") ? "preset" : "manual")
    if (model.enabled === undefined || model.source !== source) mark()
    return {
      id: model.id!.trim(),
      label: model.label?.trim() || model.id!.trim(),
      enabled: model.enabled !== false,
      source,
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens
    }
  })
}

/** 目录来源只认这三档。未知值交给调用方按预设 id 再判。 */
export function knownSource(value: string | undefined): CatalogSource | undefined {
  if (value === "preset" || value === "remote" || value === "manual") return value
  return undefined
}

export function isFamily(value: string | undefined): value is ReasoningFamilyName {
  return Boolean(value && (FAMILIES as readonly string[]).includes(value))
}

export function keyRecords(profile: NormalizedProfile): ProviderKeyRecord[] {
  return profile.keys
}
