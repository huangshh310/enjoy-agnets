/**
 * ACP 开流时把档案映成各家 CLI 认识的环境变量。
 * 有端点时按该 CLI 的协议取根和 Key，不用另一条协议的地址。
 */
import { capabilitiesFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { endpointFor, keysFor, type ProviderEndpoints, type ProviderKeyRecord } from "@enjoy-agents/providers"
import type { ApiStyle } from "@enjoy-agents/providers"

export type BindProfile = {
  baseURL?: string
  apiKey: string
  kind?: string
  apiStyle?: string
  baseAPI?: string
  endpoints?: ProviderEndpoints
  keys?: readonly ProviderKeyRecord[]
  proxy?: string
}

/** 绑定开启但没 Key 时抛给人话，不要静默退回官方登录。 */
export function requireBindProfile(profile: BindProfile | undefined): BindProfile {
  if (!profile || !hasAnyKey(profile)) {
    throw new Error("Add a provider API key in Settings → Providers before using this bound profile.")
  }
  return profile
}

/** 派生 apiKey 可能为空：Key 全锁在另一条协议上时，仍算有密钥。 */
function hasAnyKey(profile: BindProfile): boolean {
  if (profile.apiKey.trim()) return true
  return Boolean(profile.keys?.some((key) => key.enabled !== false && key.apiKey.trim()))
}

export function providerEnvFor(
  runtimeId: string,
  profile: BindProfile,
  modelId?: string
): Record<string, string> {
  const bind = capabilitiesFor(runtimeId).providerBind
  const model = modelId?.trim()
  if (bind === "anthropic") return anthropicEnv(profile, model)
  if (bind === "openai") return openaiEnv(profile)
  if (bind === "deepseek") return deepseekEnv(profile, model)
  if (bind === "google") return googleEnv(profile, model)
  if (bind === "opencode") return openCodeEnv(profile, model)
  return {}
}

function anthropicEnv(profile: BindProfile, model?: string): Record<string, string> {
  const apiKey = keyForStyle(profile, "anthropic")
  const env: Record<string, string> = {
    ANTHROPIC_BASE_URL: anthropicBase(profile),
    ANTHROPIC_API_KEY: apiKey,
    ANTHROPIC_AUTH_TOKEN: apiKey
  }
  if (model) env.ANTHROPIC_MODEL = model
  return env
}

function openaiEnv(profile: BindProfile): Record<string, string> {
  const style = codexStyle(profile)
  return {
    OPENAI_BASE_URL: openaiBase(profile, style),
    OPENAI_API_KEY: keyForStyle(profile, style)
  }
}

function deepseekEnv(profile: BindProfile, model?: string): Record<string, string> {
  const apiKey = keyForStyle(profile, "openai")
  const base = deepseekBase(profile)
  const env: Record<string, string> = {
    DEEPSEEK_API_KEY: apiKey,
    OPENAI_API_KEY: apiKey
  }
  if (base) {
    env.DEEPSEEK_BASE_URL = base
    env.OPENAI_BASE_URL = base
  }
  if (model) env.DEEPSEEK_MODEL = model
  return env
}

function googleEnv(profile: BindProfile, model?: string): Record<string, string> {
  const env: Record<string, string> = { GEMINI_API_KEY: keyForStyle(profile, "openai") }
  const base = profile.endpoints ? endpointFor(profile.endpoints, "openai") : profile.baseURL?.trim()
  if (base) {
    env.GEMINI_API_BASE_URL = base
    env.GEMINI_BASE_URL = base
  }
  if (model) env.GEMINI_MODEL = model
  return env
}

function openCodeEnv(profile: BindProfile, model?: string): Record<string, string> {
  const style = openCodeStyle(profile)
  const apiKey = keyForStyle(profile, style)
  const env: Record<string, string> = { ENJOY_OPENCODE_KEY: apiKey }
  if (profile.kind === "google") return { ...env, ...googleEnv(profile, model) }
  if (style === "anthropic") return { ...env, ...anthropicEnv({ ...profile, apiKey }, model) }
  return { ...env, ...openaiEnv({ ...profile, apiKey }) }
}

export function openCodeNpmFor(profile: BindProfile): string {
  const style = openCodeStyle(profile)
  if (style === "anthropic") return "@ai-sdk/anthropic"
  if (style === "openai-responses") return "@ai-sdk/openai"
  return "@ai-sdk/openai-compatible"
}

export function codexWireApiFor(profile: BindProfile): "responses" | "chat" {
  return codexStyle(profile) === "openai" ? "chat" : "responses"
}

function anthropicBase(profile: BindProfile): string {
  if (profile.endpoints) return endpointFor(profile.endpoints, "anthropic")
  return profile.baseURL || "https://api.anthropic.com"
}

function codexStyle(profile: BindProfile): ApiStyle {
  if (profile.endpoints) {
    return endpointFor(profile.endpoints, "openai-responses") ? "openai-responses" : "openai"
  }
  return profile.apiStyle === "openai" ? "openai" : "openai-responses"
}

function openaiBase(profile: BindProfile, style: ApiStyle): string {
  if (profile.endpoints) return endpointFor(profile.endpoints, style)
  return profile.baseURL || "https://api.openai.com/v1"
}

function deepseekBase(profile: BindProfile): string {
  if (profile.endpoints) return endpointFor(profile.endpoints, "openai") || profile.baseURL || ""
  return profile.baseURL?.trim() ?? ""
}

/**
 * 有端点时按协议取 Key。列表里没有对得上的，不退回另一条协议的派生 Key。
 * 旧档案没有端点也没有 Key 列表时，仍用那一把 apiKey。
 */
function keyForStyle(profile: BindProfile, style: ApiStyle): string {
  if (!profile.endpoints && !profile.keys?.length) return profile.apiKey
  const key = keysFor(profile, style)[0]
  if (key) return key
  if ((profile.keys?.length ?? 0) > 0) {
    throw new Error(`Add an API key for the ${style} endpoint.`)
  }
  return profile.apiKey
}

function openCodeStyle(profile: BindProfile): ApiStyle {
  if (profile.endpoints) {
    const anthropic = endpointFor(profile.endpoints, "anthropic")
    const chat = endpointFor(profile.endpoints, "openai")
    const responses = endpointFor(profile.endpoints, "openai-responses")
    if (anthropic && !chat && !responses) return "anthropic"
    if (profile.baseAPI === "openai-responses" && responses) return "openai-responses"
    if (profile.apiStyle === "anthropic" && anthropic) return "anthropic"
    if (profile.apiStyle === "openai-responses" && responses) return "openai-responses"
    if (chat) return "openai"
    if (responses) return "openai-responses"
    if (anthropic) return "anthropic"
  }
  if (profile.apiStyle === "anthropic" || profile.kind === "anthropic") return "anthropic"
  if (profile.apiStyle === "openai-responses") return "openai-responses"
  return "openai"
}
