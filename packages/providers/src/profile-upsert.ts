/**
 * 档案部分更新：没传来的端点、Key 和目录保持原样。
 * 同时带上 endpoints 时以 endpoints 为准，不用 baseURL 把兄弟端点抹掉。
 */
import type { ApiStyle } from "./api-styles.ts"
import { isApiStyle } from "./api-styles.ts"
import { cleanEndpoints, type ProviderEndpoints } from "./endpoints.ts"
import {
  endpointsFor,
  officialSiblingEndpoints,
  pickApiStyle,
  presetFor,
  type CatalogModel
} from "./presets.ts"
import { isProviderKind } from "./presets/kinds.ts"
import {
  isFamily,
  knownSource,
  withDerived,
  type LooseProfile,
  type NormalizedProfile,
  type ProfileKey,
  type ProfileUpsertInput,
  type ReasoningFamilyName,
  copyUserPrices
} from "./profile-migrate.ts"

/** 部分更新保留端点、Key 和目录。只有显式传来的字段才覆盖。 */
export function applyProfileUpsert(
  existing: NormalizedProfile | undefined,
  input: ProfileUpsertInput,
  id: string
): NormalizedProfile {
  const kind = isProviderKind(input.kind) ? input.kind : existing?.kind ?? "custom"
  const preset = presetFor(kind)
  const baseAPI = pickApiStyle(input.baseAPI ?? input.apiStyle, existing?.baseAPI ?? preset.apiStyle)
  return withDerived({
    id,
    name: input.name.trim() || existing?.name || preset.name,
    kind,
    enabled: input.enabled ?? existing?.enabled ?? true,
    endpoints: resolveEndpoints(preset, existing, input, baseAPI),
    baseAPI,
    regionId: input.regionId !== undefined ? input.regionId.trim() || undefined : existing?.regionId,
    keys: mergeKeys(existing, input, preset.requiresKey),
    models: resolveModels(preset, existing, input),
    modelsURL: input.modelsURL !== undefined ? input.modelsURL.trim() || undefined : existing?.modelsURL,
    modelId: (input.modelId ?? existing?.modelId ?? preset.models[0]?.id ?? "").trim(),
    fastModelId: input.fastModelId ?? existing?.fastModelId,
    reasoningModelId: input.reasoningModelId ?? existing?.reasoningModelId,
    reasoningFamily: pickFamily(input.reasoningFamily ?? existing?.reasoningFamily),
    contextWindow: windowOf(input.contextWindow, existing?.contextWindow),
    maxTokens: input.maxTokens ?? existing?.maxTokens,
    temperature: input.temperature ?? existing?.temperature,
    reasoningEffort: input.reasoningEffort ?? existing?.reasoningEffort,
    customHeaders: input.customHeaders,
    customBody: input.customBody,
    proxy: input.proxy !== undefined ? input.proxy.trim() : existing?.proxy,
    apiKey: "",
    baseURL: "",
    apiStyle: baseAPI
  })
}

function resolveEndpoints(
  preset: ReturnType<typeof presetFor>,
  existing: NormalizedProfile | undefined,
  input: ProfileUpsertInput,
  baseAPI: ApiStyle
): ProviderEndpoints {
  if (input.endpoints) return cleanEndpoints(input.endpoints)
  if (input.baseURL !== undefined) {
    const url = input.baseURL.trim()
    if (!url) return existing?.endpoints ?? {}
    return officialSiblingEndpoints(preset, url) ?? cleanEndpoints({ [baseAPI]: url })
  }
  if (existing) return existing.endpoints
  return endpointsFor(preset, input.regionId)
}

function mergeKeys(
  existing: NormalizedProfile | undefined,
  input: ProfileUpsertInput,
  requiresKey: boolean
): ProfileKey[] {
  if (input.keys) return keysFromInput(existing, input.keys, requiresKey)
  if (input.apiKey?.trim()) return writePrimaryKey(existing, input.apiKey.trim())
  if (existing?.keys.length) return existing.keys
  if (!requiresKey) return [{ id: "primary", name: "", apiKey: "", enabled: true }]
  return []
}

function keysFromInput(
  existing: NormalizedProfile | undefined,
  keys: NonNullable<LooseProfile["keys"]>,
  requiresKey: boolean
): ProfileKey[] {
  const merged = keys.map((key) => {
    const prev = existing?.keys.find((item) => item.id === key.id)
    return {
      id: key.id?.trim() || prev?.id || "primary",
      name: (key.name ?? prev?.name ?? "").trim(),
      apiKey: key.apiKey?.trim() ? key.apiKey.trim() : prev?.apiKey ?? "",
      apiStyle: isApiStyle(key.apiStyle) ? key.apiStyle : undefined,
      enabled: key.enabled !== false
    }
  })
  const filled = merged.filter((key) => key.apiKey.trim())
  if (filled.length > 0) return filled
  return requiresKey ? [] : merged.slice(0, 1)
}

function writePrimaryKey(existing: NormalizedProfile | undefined, apiKey: string): ProfileKey[] {
  const keys = existing?.keys.length ? existing.keys.map((key) => ({ ...key })) : []
  if (keys.length === 0) return [{ id: "primary", name: "", apiKey, enabled: true }]
  const unlocked = keys.findIndex((key) => !key.apiStyle)
  const index = unlocked >= 0 ? unlocked : 0
  const current = keys[index]!
  keys[index] = { ...current, apiKey }
  return keys
}

function resolveModels(
  preset: ReturnType<typeof presetFor>,
  existing: NormalizedProfile | undefined,
  input: ProfileUpsertInput
): CatalogModel[] | undefined {
  if (!input.models) return existing ? existing.models : preset.models
  const presetIds = new Set(preset.models.map((model) => model.id))
  return input.models.filter((model) => model.id?.trim()).map((model) => ({
    id: model.id!.trim(),
    label: model.label?.trim() || model.id!.trim(),
    enabled: model.enabled !== false,
    source: knownSource(model.source) ?? (presetIds.has(model.id ?? "") ? "preset" : "manual"),
    contextWindow: model.contextWindow,
    maxOutputTokens: model.maxOutputTokens,
    ...copyUserPrices(model)
  }))
}

function pickFamily(value: string | undefined): ReasoningFamilyName {
  return isFamily(value) ? value : "auto"
}

/** null 或 0 清掉手填窗口。缺省则保留原值。 */
function windowOf(incoming: number | null | undefined, existing?: number): number | undefined {
  if (incoming === null || incoming === 0) return undefined
  return incoming ?? existing
}
