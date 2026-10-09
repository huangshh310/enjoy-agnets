/**
 * 从档案选出这一次请求的协议、根地址和第一把 Key。
 * Google 官方主机不按 Chat / Responses / Messages 的顺序换工厂。
 */
import { isApiStyle, type ApiStyle } from "./api-styles.ts"
import { endpointFor, keysFor, speakStyle, type ProviderEndpoints, type ProviderKeyRecord } from "./endpoints.ts"
import { usesOfficialGoogle } from "./google.ts"
import type { ProviderKind } from "./presets/kinds.ts"
import type { ReasoningFamilyName } from "./reasoning.ts"
import type { ProviderConfig } from "./types.ts"

export type CallableProfile = {
  kind?: ProviderKind | string
  /** StoredSecret 用 provider，档案用 kind。两个都认。 */
  provider?: ProviderKind | string
  apiKey?: string
  baseURL?: string
  apiStyle?: string
  baseAPI?: string
  endpoints?: ProviderEndpoints
  keys?: readonly ProviderKeyRecord[]
  modelId?: string
  reasoningFamily?: ReasoningFamilyName
  proxy?: string
  customHeaders?: ProviderConfig["customHeaders"]
  customBody?: ProviderConfig["customBody"]
  temperature?: number
  maxTokens?: number
  reasoningEffort?: ProviderConfig["reasoningEffort"]
}

export function spokenCall(profile: CallableProfile, modelId?: string): {
  style: ApiStyle
  baseURL: string
  apiKey: string
  keys: string[]
} {
  void modelId
  const kind = profile.kind ?? profile.provider ?? "custom"
  const googleURL = endpointFor(profile.endpoints, "openai") || profile.baseURL
  const official = usesOfficialGoogle({ provider: kind, baseURL: googleURL })
  const preferred = isApiStyle(profile.baseAPI) ? profile.baseAPI : isApiStyle(profile.apiStyle) ? profile.apiStyle : undefined
  const style: ApiStyle = official ? "openai" : speakStyle(profile.endpoints, preferred)
  const baseURL = (official ? endpointFor(profile.endpoints, "openai") : endpointFor(profile.endpoints, style)) || profile.baseURL || ""
  // keysFor 在「有 Key 列表但没有一把对得上」时已经返回 []。这里再补 profile.apiKey 会把另一条协议的派生 Key 送出去。
  const keys = keysFor(profile, style)
  return { style, baseURL, apiKey: keys[0] ?? "", keys }
}

export function languageConfigFromProfile(profile: CallableProfile, modelId?: string): ProviderConfig {
  const spoken = spokenCall(profile, modelId)
  return {
    provider: (profile.kind ?? profile.provider ?? "custom") as ProviderKind,
    apiKey: spoken.apiKey,
    modelId: modelId || profile.modelId || "",
    baseURL: spoken.baseURL,
    apiStyle: spoken.style,
    reasoningFamily: profile.reasoningFamily,
    proxy: profile.proxy,
    customHeaders: profile.customHeaders,
    customBody: profile.customBody,
    temperature: profile.temperature,
    maxTokens: profile.maxTokens,
    reasoningEffort: profile.reasoningEffort
  }
}
