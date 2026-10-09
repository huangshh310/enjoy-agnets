/**
 * 已存供应商探测 / ping：缺字段时从 vault 补。
 */
import { PingProviderInput, ProbeProviderInput } from "@enjoy-agents/ipc-contract"
import { DetectProviderInput, DuplicateProviderInput, SetProviderEnabledInput } from "@enjoy-agents/ipc-contract"
import {
  catalogRequestURL,
  detectProtocols,
  endpointFor,
  isApiStyle,
  parseProviderKind,
  pingProviderEndpoint,
  presetFor,
  probeProvider,
  type ApiStyle,
  type CatalogModel,
  type ProviderKind
} from "@enjoy-agents/providers"
import { duplicateProfile, setProfileEnabled } from "./services/secrets"
import { readVault, writeVault } from "./services/secrets"

export function asKind(value: string): ProviderKind {
  return parseProviderKind(value)
}

export async function probeStoredProvider(raw: unknown) {
  const input = ProbeProviderInput.parse(raw)
  const vault = await readVault()
  const stored = input.id ? vault.profiles.find((profile) => profile.id === input.id) : undefined
  const kind = asKind(input.kind)
  const baseURL = input.baseURL?.trim() || (stored ? catalogRequestURL(stored) : presetFor(kind).defaultBaseURL)
  const fallbackStyle = isApiStyle(input.apiStyle)
    ? input.apiStyle
    : isApiStyle(stored?.apiStyle)
      ? stored.apiStyle
      : presetFor(kind).apiStyle
  const result = await probeProvider({
    provider: kind,
    apiKey: input.apiKey?.trim() ? input.apiKey.trim() : (stored?.apiKey ?? ""),
    baseURL,
    modelId: input.modelId || stored?.modelId,
    // Chat / Responses 根上的 /models 是 OpenAI 目录。baseAPI 为 Anthropic 时不能拿这条根去打 Messages 目录。
    apiStyle: catalogFetchStyle(baseURL, stored?.endpoints, fallbackStyle)
  })
  if (result.ok && result.models.length > 0 && stored) {
    const presetModels = stored.models?.length ? stored.models : presetFor(kind).models
    stored.models = mergeDiscoveredModels(presetModels, result.models)
    if (!stored.modelId) stored.modelId = stored.models[0]?.id ?? ""
    await writeVault(vault)
  }
  return result
}

/** 远程新增的模型追加为启用。用户关掉的和手填的保持原样，远程消失的不删。 */
function mergeDiscoveredModels(existing: CatalogModel[], remote: CatalogModel[]): CatalogModel[] {
  const known = new Set(existing.map((model) => model.id))
  const added = remote
    .filter((model) => model.id && !known.has(model.id))
    .map((model) => ({ ...model, enabled: true, source: "remote" as const }))
  return [...existing, ...added]
}

export async function detectStoredProvider(raw: unknown) {
  const input = DetectProviderInput.parse(raw)
  const vault = await readVault()
  const stored = input.id ? vault.profiles.find((profile) => profile.id === input.id) : undefined
  const apiKey = input.apiKey?.trim() || stored?.apiKey || ""
  return detectProtocols({
    baseURL: input.baseURL,
    apiKey,
    modelId: input.modelId || stored?.modelId,
    headers: headerRecord(input.customHeaders || stored?.customHeaders)
  })
}

export async function duplicateStoredProvider(raw: unknown) {
  const input = DuplicateProviderInput.parse(raw)
  await duplicateProfile(input.id, input.name)
}

export async function setStoredProviderEnabled(raw: unknown) {
  const input = SetProviderEnabledInput.parse(raw)
  await setProfileEnabled(input.id, input.enabled)
}

/** Chat / Responses 目录是 OpenAI `/models`。只有没落到这两条根上时才沿用档案协议。 */
function catalogFetchStyle(
  baseURL: string,
  endpoints: Parameters<typeof endpointFor>[0],
  fallback: ApiStyle
): ApiStyle {
  const url = baseURL.trim().replace(/\/+$/, "")
  const chat = endpointFor(endpoints, "openai")
  const responses = endpointFor(endpoints, "openai-responses")
  if ((chat && url === chat) || (responses && url === responses)) return "openai"
  return fallback === "openai-responses" ? "openai" : fallback
}

function headerRecord(raw?: string): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) headers[key] = value
    }
    return headers
  } catch {
    return undefined
  }
}

export async function pingStoredProvider(raw: unknown) {
  const input = PingProviderInput.parse(raw)
  const vault = await readVault()
  const stored = input.id ? vault.profiles.find((profile) => profile.id === input.id) : undefined
  const kind = asKind(input.kind)
  return pingProviderEndpoint({
    provider: kind,
    apiKey: input.apiKey?.trim() ? input.apiKey.trim() : (stored?.apiKey ?? ""),
    baseURL: input.baseURL ?? stored?.baseURL ?? presetFor(kind).defaultBaseURL,
    apiStyle: isApiStyle(input.apiStyle)
      ? input.apiStyle
      : isApiStyle(stored?.apiStyle)
        ? stored.apiStyle
        : presetFor(kind).apiStyle
  })
}
