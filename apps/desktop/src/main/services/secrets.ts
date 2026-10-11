/**
 * 供应商档案：增删改、激活模型、对外模型目录。密钥只在 main。
 */
import {
  applyProfileUpsert,
  filledStyles,
  gatewayContextWindowFor,
  modelsForProvider,
  presetFor,
  publishedContextWindow,
  resolveModelContextWindow,
  type ProfileUpsertInput,
  type ProviderKind
} from "@enjoy-agents/providers"
import { unbindProviderFromAgentTools } from "./agent-tools-vault"
import { listedModelsFromProfiles } from "./listed-models"
import { pickActiveEnabled } from "./pick-active-enabled"
import { createId } from "./ids"
import { mergeJsonSecrets } from "./secret-map"
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
export { listedModelsFromProfiles } from "./listed-models"

export async function listPublicProviders(): Promise<ProviderPublic[]> {
  const vault = await readVault()
  return vault.profiles.map((profile) => toPublic(profile, vault.activeId))
}

export async function getActiveProfile(): Promise<ProviderProfile | undefined> {
  const vault = await readVault()
  return pickActiveEnabled(vault.profiles, {
    enabled: (profile) => profile.enabled,
    active: (profile) => (profile.id === vault.activeId ? true : undefined)
  })
}

export async function findProfileByKinds(kinds: readonly string[]): Promise<ProviderProfile | undefined> {
  const vault = await readVault()
  const matches = vault.profiles.filter((profile) => profile.enabled && kinds.includes(profile.kind))
  const active = matches.find((profile) => profile.id === vault.activeId && profile.apiKey.trim())
  if (active) return active
  return matches.find((profile) => profile.apiKey.trim())
}

export async function upsertProfile(input: ProfileUpsertInput & { activate?: boolean }): Promise<ProviderPublic> {
  const vault = await readVault()
  const existing = input.id ? vault.profiles.find((profile) => profile.id === input.id) : undefined
  const id = existing?.id ?? createId("prv")
  const preset = presetFor(input.kind as ProviderKind)
  const profile = applyProfileUpsert(
    existing,
    {
      ...input,
      customHeaders: mergeJsonSecrets(input.customHeaders, existing?.customHeaders),
      customBody: mergeJsonSecrets(input.customBody, existing?.customBody)
    },
    id
  )
  if (preset.requiresKey && !profile.apiKey.trim()) {
    throw new Error("API key is required for this provider.")
  }
  vault.profiles = existing
    ? vault.profiles.map((item) => (item.id === id ? profile : item))
    : [profile, ...vault.profiles]
  pointActive(vault, profile, input.activate)
  await writeVault(vault)
  return toPublic(profile, vault.activeId)
}

export async function duplicateProfile(id: string, name: string): Promise<ProviderPublic> {
  const vault = await readVault()
  const source = vault.profiles.find((profile) => profile.id === id)
  if (!source) throw new Error("Unknown provider.")
  const copy = applyProfileUpsert(
    undefined,
    {
      ...source,
      name,
      keys: source.keys.map((key) => ({ ...key, id: createId("key") })),
      endpoints: { ...source.endpoints },
      models: source.models?.map((model) => ({ ...model }))
    },
    createId("prv")
  )
  vault.profiles = [copy, ...vault.profiles]
  await writeVault(vault)
  return toPublic(copy, vault.activeId)
}

export async function setProfileEnabled(id: string, enabled: boolean): Promise<ProviderPublic> {
  const vault = await readVault()
  const current = vault.profiles.find((profile) => profile.id === id)
  if (!current) throw new Error("Unknown provider.")
  const profile = { ...current, enabled }
  vault.profiles = vault.profiles.map((item) => (item.id === id ? profile : item))
  if (!enabled && vault.activeId === id) {
    vault.activeId = vault.profiles.find((item) => item.enabled)?.id ?? null
  }
  await writeVault(vault)
  return toPublic(profile, vault.activeId)
}

export async function removeProfile(id: string): Promise<void> {
  unbindProviderFromAgentTools(id)
  const vault = await readVault()
  vault.profiles = vault.profiles.filter((profile) => profile.id !== id)
  if (vault.activeId === id) {
    vault.activeId = vault.profiles.find((item) => item.enabled)?.id ?? null
  }
  await writeVault(vault, { allowInsecure: true })
}

export async function activateProfile(id: string): Promise<ProviderPublic> {
  const vault = await readVault()
  const profile = vault.profiles.find((item) => item.id === id)
  if (!profile) throw new Error("Unknown provider.")
  if (!profile.enabled) throw new Error("Enable the provider before using it.")
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
  if (!target) target = vault.profiles.find((item) => item.enabled)
  // 关闭的档案不能被选成 Enjoy Local 默认，否则会把 activeId 又指回去。
  if (!target?.enabled) return undefined
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
    models: profile.models,
    endpoints: profile.endpoints,
    keys: profile.keys,
    baseAPI: profile.baseAPI,
    reasoningFamily: profile.reasoningFamily,
    proxy: profile.proxy,
    enabled: profile.enabled
  }
}

export async function hasSecret(): Promise<boolean> {
  const profile = await getActiveProfile()
  if (!profile) return false
  return presetFor(profile.kind).requiresKey ? Boolean(profile.apiKey) : true
}

export function publicModelsFor(profile: ProviderProfile | undefined, isActive = true) {
  if (!profile?.enabled) return []
  return modelsForProvider(profile.kind, profile.modelId, profile.models).map((model) => ({
    id: model.id,
    label: model.label,
    provider: profile.kind,
    providerId: profile.id,
    providerName: profile.name,
    apiStyle: resolvedStyle(profile),
    wireStyles: filledStyles(profile.endpoints),
    active: isActive,
    isFast: Boolean(profile.fastModelId && profile.fastModelId === model.id),
    isReasoning: Boolean(profile.reasoningModelId && profile.reasoningModelId === model.id),
    supportsReasoning: true,
    reasoningEffort: profile.reasoningEffort,
    contextWindow: model.contextWindow ?? profile.contextWindow,
    maxTokens: model.maxOutputTokens ?? profile.maxTokens
  }))
}

export async function listAllPublicModels() {
  const vault = await readVault()
  const listed = listedModelsFromProfiles(vault.profiles, vault.activeId, publicModelsFor)
  if (listed.length === 0) return []
  return Promise.all(
    listed.map(async (model) => {
      const profile = vault.profiles.find((item) => item.id === model.providerId)
      const row = profile?.models?.find((item) => item.id === model.id)
      return {
        ...model,
        contextWindow: await resolveListedWindow(model.id, model.provider, row?.contextWindow, profile?.contextWindow)
      }
    })
  )
}

/** 行上的窗口优先，空则档案手填，再 Gateway，再厂商公开窗口。 */
async function resolveListedWindow(
  modelId: string,
  provider?: string,
  rowWindow?: number,
  profileWindow?: number
) {
  return (
    resolveModelContextWindow({
      modelId,
      provider,
      profileWindow: rowWindow ?? profileWindow,
      gatewayWindow: await gatewayContextWindowFor(modelId, provider)
    }) ?? publishedContextWindow(modelId)
  )
}

function pointActive(
  vault: { activeId: string | null; profiles: ProviderProfile[] },
  profile: ProviderProfile,
  activate: boolean | undefined
): void {
  if (!profile.enabled && vault.activeId === profile.id) {
    vault.activeId = vault.profiles.find((item) => item.enabled)?.id ?? null
    return
  }
  if (profile.enabled && (activate !== false || !vault.activeId)) vault.activeId = profile.id
}
