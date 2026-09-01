/**
 * 已存供应商探测 / ping：缺字段时从 vault 补。
 */
import { PingProviderInput, ProbeProviderInput } from "@enjoy-agents/ipc-contract"
import { isApiStyle, parseProviderKind, pingProviderEndpoint, presetFor, probeProvider, type ProviderKind } from "@enjoy-agents/providers"
import { readVault, writeVault } from "./services/secrets"

export function asKind(value: string): ProviderKind {
  return parseProviderKind(value)
}

export async function probeStoredProvider(raw: unknown) {
  const input = ProbeProviderInput.parse(raw)
  const vault = await readVault()
  const stored = input.id ? vault.profiles.find((profile) => profile.id === input.id) : undefined
  const kind = asKind(input.kind)
  const result = await probeProvider({
    provider: kind,
    apiKey: input.apiKey?.trim() ? input.apiKey.trim() : (stored?.apiKey ?? ""),
    baseURL: input.baseURL ?? stored?.baseURL ?? presetFor(kind).defaultBaseURL,
    modelId: input.modelId || stored?.modelId,
    apiStyle: isApiStyle(input.apiStyle)
      ? input.apiStyle
      : isApiStyle(stored?.apiStyle)
        ? stored.apiStyle
        : presetFor(kind).apiStyle
  })
  if (result.ok && result.models.length > 0 && stored) {
    stored.models = result.models
    if (result.resolvedBaseURL) stored.baseURL = result.resolvedBaseURL
    if (!result.models.some((item) => item.id === stored.modelId)) {
      stored.modelId = result.models[0].id
    }
    await writeVault(vault)
  }
  return result
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
