/**
 * ACP 开流时把 Enjoy vault 档案映成各家 CLI 认识的环境变量。
 * 只给子进程，不进 renderer。
 */
import { capabilitiesFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"

export type BindProfile = {
  baseURL?: string
  apiKey: string
  kind?: string
  apiStyle?: string
}

/** 绑定开启但没 Key 时抛给人话，不要静默退回官方登录。 */
export function requireBindProfile(profile: BindProfile | undefined): BindProfile {
  if (!profile?.apiKey.trim()) {
    throw new Error("Add a provider API key in Settings → Providers before using this bound profile.")
  }
  return profile
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
  const env: Record<string, string> = {
    ANTHROPIC_BASE_URL: profile.baseURL || "https://api.anthropic.com",
    ANTHROPIC_API_KEY: profile.apiKey,
    ANTHROPIC_AUTH_TOKEN: profile.apiKey
  }
  if (model) env.ANTHROPIC_MODEL = model
  return env
}

function openaiEnv(profile: BindProfile): Record<string, string> {
  return {
    OPENAI_BASE_URL: profile.baseURL || "https://api.openai.com/v1",
    OPENAI_API_KEY: profile.apiKey
  }
}

function deepseekEnv(profile: BindProfile, model?: string): Record<string, string> {
  const env: Record<string, string> = {
    DEEPSEEK_API_KEY: profile.apiKey,
    OPENAI_API_KEY: profile.apiKey
  }
  if (profile.baseURL?.trim()) {
    env.DEEPSEEK_BASE_URL = profile.baseURL.trim()
    env.OPENAI_BASE_URL = profile.baseURL.trim()
  }
  if (model) env.DEEPSEEK_MODEL = model
  return env
}

function googleEnv(profile: BindProfile, model?: string): Record<string, string> {
  const env: Record<string, string> = { GEMINI_API_KEY: profile.apiKey }
  if (profile.baseURL?.trim()) {
    env.GEMINI_API_BASE_URL = profile.baseURL.trim()
    env.GEMINI_BASE_URL = profile.baseURL.trim()
  }
  if (model) env.GEMINI_MODEL = model
  return env
}

function openCodeEnv(profile: BindProfile, model?: string): Record<string, string> {
  const env: Record<string, string> = { ENJOY_OPENCODE_KEY: profile.apiKey }
  const kind = profile.kind?.trim()
  const style = profile.apiStyle?.trim()
  if (kind === "google") return { ...env, ...googleEnv(profile, model) }
  if (style === "anthropic" || kind === "anthropic") return { ...env, ...anthropicEnv(profile, model) }
  return { ...env, ...openaiEnv(profile) }
}

export function openCodeNpmFor(profile: BindProfile): string {
  if (profile.apiStyle === "anthropic" || profile.kind === "anthropic") return "@ai-sdk/anthropic"
  if (profile.apiStyle === "openai-responses") return "@ai-sdk/openai"
  return "@ai-sdk/openai-compatible"
}

export function codexWireApiFor(profile: BindProfile): "responses" | "chat" {
  return profile.apiStyle === "openai" ? "chat" : "responses"
}
