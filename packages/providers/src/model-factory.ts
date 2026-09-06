/**
 * 选 LanguageModel 工厂：官方 OpenAI 用 createOpenAI；
 * 中转 / 国产兼容端点必须 createOpenAICompatible，才能解析 reasoning_content。
 */
import { usesOfficialGoogle } from "./google.ts"
import { usesDeepSeekReasoningApi } from "./reasoning.ts"
import type { ApiStyle } from "./api-styles.ts"
import type { ProviderKind } from "./presets.ts"

export type LanguageModelFactoryKind =
  | "gateway"
  | "google"
  | "anthropic"
  | "deepseek"
  | "openai-responses"
  | "openai"
  | "openai-compatible"

const OFFICIAL_OPENAI_HOST = /api\.openai\.com/i

const COMPAT_KINDS = new Set<string>([
  "custom",
  "kimi",
  "zhipu",
  "minimax",
  "siliconflow",
  "qwen",
  "ollama",
  "groq",
  "openrouter"
])

export function languageModelFactoryKind(config: {
  provider: ProviderKind | string
  modelId: string
  baseURL?: string
  apiStyle?: ApiStyle | string
}): LanguageModelFactoryKind {
  if (config.provider === "gateway") return "gateway"
  if (usesOfficialGoogle({ provider: config.provider, baseURL: config.baseURL })) return "google"
  if (config.apiStyle === "anthropic") return "anthropic"
  if (usesDeepSeekReasoningApi(config)) return "deepseek"
  if (config.apiStyle === "openai-responses") return "openai-responses"
  if (config.provider === "openai" && isOfficialOpenAIHost(config.baseURL)) return "openai"
  if (COMPAT_KINDS.has(config.provider) || config.provider === "openai") return "openai-compatible"
  return "openai-compatible"
}

function isOfficialOpenAIHost(baseURL?: string): boolean {
  if (!baseURL?.trim()) return true
  return OFFICIAL_OPENAI_HOST.test(baseURL)
}
