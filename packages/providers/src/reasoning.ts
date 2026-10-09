/**
 * 思考档接线：对照 AI SDK 7 + 各厂官方字段。
 * 中转必须 createOpenAICompatible，才能解析 reasoning_content。
 * MiniMax：thinking.adaptive；reasoning_split 只给官方 MiniMax 域名。
 * 中转发 reasoning_split 会 Validation 拒掉，思考栏空转后报错。
 * GLM：thinking.enabled + reasoningEffort。Kimi K3：顶层 reasoning。
 * DeepSeek 思考走 @ai-sdk/deepseek。
 */
import type { ApiStyle } from "./api-styles"
import type { ProviderKind } from "./presets"

const MINIMAX_PRESET_URL = "https://api.minimax.io/v1"

export type ReasoningFamilyName = "auto" | "minimax" | "glm" | "kimi" | "deepseek" | "default"

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh"

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type ProviderOptions = Record<string, { [key: string]: JsonValue }>

/** createOpenAICompatible 的 name，必须与 providerOptions 键一致。 */
export const OPENAI_COMPAT_NAME = "openaiCompatible"

export function isDeepSeekModelId(modelId: string): boolean {
  const id = modelId.toLowerCase()
  return (
    id.includes("deepseek-v4") ||
    id.startsWith("deepseek-") ||
    id.startsWith("deepseek/") ||
    id.includes("deepseek-ai/deepseek")
  )
}

export function isMiniMaxModelId(modelId: string): boolean {
  return modelId.toLowerCase().includes("minimax")
}

/** 只有官方 MiniMax 认 reasoning_split；中转 /v1 会直接 Validation 拒绝。 */
export function isOfficialMiniMaxHost(baseURL?: string): boolean {
  if (!baseURL?.trim()) return false
  return /(?:^|[./])minimax(?:i)?\.(?:io|chat|com)(?:[/:]|$)/i.test(baseURL)
}

export function isGlmModelId(modelId: string): boolean {
  const id = modelId.toLowerCase()
  return id.includes("glm") || id.includes("chatglm")
}

export function isKimiModelId(modelId: string): boolean {
  const id = modelId.toLowerCase()
  return id.includes("kimi") || id.includes("moonshot")
}

/**
 * auto 跟 kind。custom 才看模型 id 前缀。
 * 硅基流动这类中转即使模型名带 deepseek，也不进 @ai-sdk/deepseek。
 */
export function resolveReasoningFamily(config: {
  provider: ProviderKind | string
  modelId: string
  reasoningFamily?: ReasoningFamilyName | string
}): Exclude<ReasoningFamilyName, "auto"> {
  const explicit = config.reasoningFamily
  if (explicit && explicit !== "auto" && isFamilyName(explicit)) return explicit
  if (config.provider === "minimax") return "minimax"
  if (config.provider === "zhipu" || config.provider === "zai") return "glm"
  if (config.provider === "kimi") return "kimi"
  if (config.provider === "deepseek") return "deepseek"
  if (config.provider === "custom") return familyFromModelId(config.modelId)
  return "default"
}

export function usesDeepSeekReasoningApi(config: {
  provider: ProviderKind | string
  modelId: string
  apiStyle?: ApiStyle | string
  reasoningFamily?: ReasoningFamilyName | string
}): boolean {
  if (config.apiStyle === "anthropic" || config.apiStyle === "openai-responses") return false
  return resolveReasoningFamily(config) === "deepseek"
}

/** @ai-sdk/deepseek 2.x 只读 providerOptions.deepseek，不读顶层 reasoning。 */
export function deepseekCallOptions(effort?: ReasoningEffort) {
  return {
    deepseek: {
      thinking: { type: "enabled" as const },
      ...(effort ? { reasoningEffort: effort } : {})
    }
  }
}

/**
 * MiniMax：思考用 thinking.adaptive。
 * reasoning_split 只在官方域名发，用来把思考拆到 reasoning_content。
 * 中转不认这个字段；不拆时思考会进 content 的 <think>，UI 再切开。
 */
export function miniMaxThinkingOptions(effort?: ReasoningEffort, baseURL?: string) {
  const split = isOfficialMiniMaxHost(baseURL)
  if (!effort && !split) return undefined
  return {
    [OPENAI_COMPAT_NAME]: {
      ...(split ? { reasoning_split: true } : {}),
      ...(effort ? { thinking: { type: "adaptive" as const } } : {})
    }
  }
}

/**
 * GLM：官方要 thinking.type，5.2+ 另认 reasoning_effort。
 * 两者都放兼容层键上，避免只发顶层 reasoning 被网关忽略。
 * 未选档不强制 disabled。
 */
export function glmThinkingOptions(effort?: ReasoningEffort) {
  if (!effort) return undefined
  return {
    [OPENAI_COMPAT_NAME]: {
      thinking: { type: "enabled" as const },
      reasoningEffort: effort
    }
  }
}

export function reasoningCallOptions(config: {
  provider: ProviderKind | string
  modelId: string
  apiStyle?: ApiStyle | string
  effort?: ReasoningEffort
  baseURL?: string
  reasoningFamily?: ReasoningFamilyName | string
}): {
  reasoning?: ReasoningEffort
  providerOptions?: ProviderOptions
} {
  const family = resolveReasoningFamily(config)
  if (family === "deepseek" && config.apiStyle !== "anthropic" && config.apiStyle !== "openai-responses") {
    return { reasoning: config.effort, providerOptions: deepseekCallOptions(config.effort) }
  }
  if (family === "minimax") {
    const providerOptions = miniMaxThinkingOptions(config.effort, hostFor(config))
    return providerOptions ? { providerOptions } : {}
  }
  if (family === "glm") {
    const providerOptions = glmThinkingOptions(config.effort)
    return providerOptions ? { providerOptions } : {}
  }
  return { reasoning: config.effort }
}

function familyFromModelId(modelId: string): Exclude<ReasoningFamilyName, "auto"> {
  const id = modelId.toLowerCase()
  if (id.startsWith("minimax")) return "minimax"
  if (id.startsWith("glm")) return "glm"
  if (id.startsWith("kimi") || id.startsWith("moonshot")) return "kimi"
  if (id.startsWith("deepseek")) return "deepseek"
  return "default"
}

function isFamilyName(value: string): value is Exclude<ReasoningFamilyName, "auto"> {
  return value === "minimax" || value === "glm" || value === "kimi" || value === "deepseek" || value === "default"
}

function hostFor(config: { provider: string; baseURL?: string }): string {
  if (config.baseURL?.trim()) return config.baseURL
  return config.provider === "minimax" ? MINIMAX_PRESET_URL : ""
}
