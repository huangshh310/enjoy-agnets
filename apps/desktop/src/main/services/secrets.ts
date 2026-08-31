/**
 * 供应商档案：增删改、激活模型、对外模型目录。密钥只在 main。
 */
import {
  isApiStyle,
  modelsForProvider,
  presetFor,
  type ApiStyle,
  type CatalogModel,
  type ProviderKind
} from "@enjoy-agents/providers"
import { createId } from "./ids"
import {
  readVault,
  resolvedStyle,
  toPublic,
  writeVault,
  type ProviderProfile,
  type ProviderPublic,
  type StoredSecret
} from "./secrets-vault"

export type { ProviderProfile, ProviderPublic, StoredSecret } from "./secrets-vault"
export { readVault, writeVault } from "./secrets-vault"

export async function listPublicProviders(): Promise<ProviderPublic[]> {
  const vault = await readVault()
  return vault.profiles.map((profile) => toPublic(profile, vault.activeId))
}

export async function getActiveProfile(): Promise<ProviderProfile | undefined> {
  const vault = await readVault()
  return vault.profiles.find((profile) => profile.id === vault.activeId) ?? vault.profiles[0]
}

export async function findProfileByKinds(kinds: readonly string[]): Promise<ProviderProfile | undefined> {
  const vault = await readVault()
  const matches = vault.profiles.filter((profile) => kinds.includes(profile.kind))
  const active = matches.find((profile) => profile.id === vault.activeId && profile.apiKey.trim())
  if (active) return active
  return matches.find((profile) => profile.apiKey.trim())
}

export async function upsertProfile(input: {
  id?: string
  name: string
  kind: ProviderKind
  apiKey?: string
  baseURL?: string
  modelId?: string
  apiStyle?: string
  fastModelId?: string
  reasoningModelId?: string
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: "low" | "medium" | "high" | "xhigh"
  customHeaders?: string
  customBody?: string
  models?: CatalogModel[]
  activate?: boolean
}): Promise<ProviderPublic> {
  const vault = await readVault()
  const preset = presetFor(input.kind)
  const existing = input.id ? vault.profiles.find((profile) => profile.id === input.id) : undefined
  const id = existing?.id ?? createId("prv")
  const apiKey = input.apiKey?.trim() ? input.apiKey.trim() : (existing?.apiKey ?? "")
  if (preset.requiresKey && !apiKey) {
    throw new Error("API key is required for this provider.")
  }
  const profile: ProviderProfile = {
    id,
    name: input.name.trim() || preset.name,
    kind: input.kind,
    apiKey,
    baseURL: (input.baseURL ?? existing?.baseURL ?? preset.defaultBaseURL).trim(),
    modelId: (input.modelId ?? existing?.modelId ?? preset.models[0]?.id ?? "").trim(),
    apiStyle: isApiStyle(input.apiStyle)
      ? input.apiStyle
      : resolvedStyle({ kind: input.kind, apiStyle: existing?.apiStyle ?? preset.apiStyle }),
    fastModelId: input.fastModelId ?? existing?.fastModelId,
    reasoningModelId: input.reasoningModelId ?? existing?.reasoningModelId,
    contextWindow: input.contextWindow ?? existing?.contextWindow,
    maxTokens: input.maxTokens ?? existing?.maxTokens,
    temperature: input.temperature ?? existing?.temperature,
    reasoningEffort: input.reasoningEffort ?? existing?.reasoningEffort,
    customHeaders: input.customHeaders ?? existing?.customHeaders,
    customBody: input.customBody ?? existing?.customBody,
    models: input.models ?? existing?.models
  }
  vault.profiles = existing
    ? vault.profiles.map((item) => (item.id === id ? profile : item))
    : [profile, ...vault.profiles]
  if (input.activate !== false || !vault.activeId) vault.activeId = id
  await writeVault(vault)
  return toPublic(profile, vault.activeId)
}

export async function removeProfile(id: string): Promise<void> {
  const vault = await readVault()
  vault.profiles = vault.profiles.filter((profile) => profile.id !== id)
  if (vault.activeId === id) vault.activeId = vault.profiles[0]?.id ?? null
  await writeVault(vault)
}

export async function activateProfile(id: string): Promise<ProviderPublic> {
  const vault = await readVault()
  const profile = vault.profiles.find((item) => item.id === id)
  if (!profile) throw new Error("Unknown provider.")
  vault.activeId = id
  await writeVault(vault)
  return toPublic(profile, id)
}

export async function setActiveModel(input: {
  providerId?: string
  modelId: string
}): Promise<ProviderPublic | undefined> {
  const vault = await readVault()
  let target = input.providerId ? vault.profiles.find((item) => item.id === input.providerId) : undefined
  if (!target && vault.activeId) target = vault.profiles.find((item) => item.id === vault.activeId)
  if (!target) target = vault.profiles[0]
  if (!target) return undefined
  target.modelId = input.modelId.trim()
  vault.activeId = target.id
  await writeVault(vault)
  return toPublic(target, vault.activeId)
}

export async function saveSecret(secret: StoredSecret): Promise<void> {
  const preset = presetFor(secret.provider)
  await upsertProfile({
    name: preset.name,
    kind: secret.provider,
    apiKey: secret.apiKey,
    baseURL: secret.baseURL,
    modelId: secret.modelId,
    activate: true
  })
}

export async function readSecret(): Promise<StoredSecret | undefined> {
  const profile = await getActiveProfile()
  if (!profile) return undefined
  return {
    provider: profile.kind,
    apiKey: profile.apiKey,
    baseURL: profile.baseURL,
    modelId: profile.modelId,
    apiStyle: resolvedStyle(profile),
    fastModelId: profile.fastModelId,
    reasoningModelId: profile.reasoningModelId,
    contextWindow: profile.contextWindow,
    maxTokens: profile.maxTokens,
    temperature: profile.temperature,
    reasoningEffort: profile.reasoningEffort,
    customHeaders: profile.customHeaders,
    customBody: profile.customBody,
    models: profile.models
  }
}

export async function hasSecret(): Promise<boolean> {
  const profile = await getActiveProfile()
  if (!profile) return false
  return presetFor(profile.kind).requiresKey ? Boolean(profile.apiKey) : true
}

export function publicModelsFor(profile: ProviderProfile | undefined, isActive = true) {
  if (!profile) return []
  return modelsForProvider(profile.kind, profile.modelId, profile.models).map((model) => ({
    id: model.id,
    label: model.label,
    provider: profile.kind,
    providerId: profile.id,
    providerName: profile.name,
    apiStyle: resolvedStyle(profile),
    active: isActive,
    isFast: Boolean(profile.fastModelId && profile.fastModelId === model.id),
    isReasoning: Boolean(profile.reasoningModelId && profile.reasoningModelId === model.id),
    supportsReasoning: true,
    reasoningEffort: profile.reasoningEffort
  }))
}

export async function listAllPublicModels() {
  const vault = await readVault()
  if (vault.profiles.length === 0) {
    return modelsForProvider("deepseek").map((model) => ({
      id: model.id,
      label: model.label,
      provider: "deepseek",
      providerId: "default",
      providerName: "DeepSeek",
      apiStyle: "openai" as ApiStyle,
      active: true,
      isFast: false,
      isReasoning: false,
      supportsReasoning: true
    }))
  }
  return vault.profiles.flatMap((profile) => publicModelsFor(profile, profile.id === vault.activeId))
}
