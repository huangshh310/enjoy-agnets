/**
 * 按协议与模型族创建 LanguageModel。
 * DeepSeek 思考必须走 @ai-sdk/deepseek，否则 reasoning_content 进不了 fullStream。
 */
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGateway } from "@ai-sdk/gateway"
import { createGoogle } from "@ai-sdk/google"
import type { LanguageModel } from "ai"
import { parseHeaders, resolvedBaseURL } from "./config"
import { usesOfficialGoogle } from "./google"
import { wrapWithDefaults } from "./middleware"
import { isMediaOnlyKind, presetFor } from "./presets"
import { usesDeepSeekReasoningApi } from "./reasoning"
import type { ProviderConfig } from "./types"

export function createLanguageModel(config: ProviderConfig): LanguageModel {
  return wrapWithDefaults(createRawLanguageModel(config), {
    temperature: config.temperature,
    maxTokens: config.maxTokens
  })
}

function createRawLanguageModel(config: ProviderConfig): LanguageModel {
  if (isMediaOnlyKind(config.provider)) {
    throw new Error(`${config.provider} is a media provider. Switch to a language provider for chat.`)
  }
  const preset = presetFor(config.provider)
  const baseURL = resolvedBaseURL(config)
  const apiKey = config.apiKey || (preset.requiresKey ? "" : "ollama")
  const apiStyle = config.apiStyle ?? preset.apiStyle
  const headers = parseHeaders(config.customHeaders)
  const connection = { apiKey, baseURL: baseURL || undefined, headers }

  if (config.provider === "gateway") {
    return createGateway({ apiKey, baseURL: baseURL || undefined, headers }).languageModel(config.modelId) as LanguageModel
  }
  if (usesOfficialGoogle({ provider: config.provider, baseURL })) {
    return createGoogle({ apiKey, baseURL: baseURL || undefined, headers })(config.modelId)
  }
  if (apiStyle === "anthropic") {
    return createAnthropic(connection)(config.modelId)
  }
  if (usesDeepSeekReasoningApi({ ...config, apiStyle })) {
    return createDeepSeek(connection)(config.modelId)
  }

  const openai = createOpenAI(connection)
  if (apiStyle === "openai-responses") {
    return openai.responses(config.modelId)
  }
  return openai(config.modelId)
}
