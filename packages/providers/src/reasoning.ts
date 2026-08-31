/**
 * DeepSeek 思考走 reasoning_content，必须用官方 DeepSeek provider。
 * 通用 @ai-sdk/openai 会丢掉该字段，UI 就只剩耗时没有正文。
 */
import type { ApiStyle } from "./api-styles"
import type { ProviderKind } from "./presets"

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh"

export function isDeepSeekModelId(modelId: string): boolean {
  const id = modelId.toLowerCase()
  return (
    id.includes("deepseek-v4") ||
    id.startsWith("deepseek-") ||
    id.startsWith("deepseek/") ||
    id.includes("deepseek-ai/deepseek")
  )
}

/**
 * OpenAI 官方协议自己处理 reasoning；Anthropic / Responses 不走 DeepSeek SDK。
 * OpenRouter / 硅基流动上的 DeepSeek 模型仍返回 reasoning_content，要换 provider。
 */
export function usesDeepSeekReasoningApi(config: {
  provider: ProviderKind | string
  modelId: string
  apiStyle?: ApiStyle | string
}): boolean {
  if (config.apiStyle === "anthropic" || config.apiStyle === "openai-responses") {
    return false
  }
  if (config.provider === "openai") return false
  if (config.provider === "deepseek") return true
  return isDeepSeekModelId(config.modelId)
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
