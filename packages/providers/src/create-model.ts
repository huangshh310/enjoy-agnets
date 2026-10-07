/**
 * 按协议与模型族创建 LanguageModel。
 * 中转必须 createOpenAICompatible，官方 createOpenAI 会丢掉 reasoning_content。
 */
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGateway } from "@ai-sdk/gateway"
import { createGoogle } from "@ai-sdk/google"
import type { LanguageModel } from "ai"
import { parseHeaders, resolvedBaseURL } from "./config"
import { fetchForProxy } from "./proxy-fetch"
import { languageModelFactoryKind } from "./model-factory"
import { wrapWithDefaults } from "./middleware"
import { isMediaOnlyKind, presetFor } from "./presets"
import { OPENAI_COMPAT_NAME } from "./reasoning"
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
  const headers = parseHeaders(config.customHeaders)
  const fetchImpl = config.fetch ?? fetchForProxy(config.proxy)
  const connection = {
    apiKey,
    baseURL: baseURL || undefined,
    headers,
    ...(fetchImpl ? { fetch: fetchImpl } : {})
  }
  const kind = languageModelFactoryKind({
    provider: config.provider,
    modelId: config.modelId,
    baseURL: config.baseURL,
    apiStyle: config.apiStyle ?? preset.apiStyle,
    reasoningFamily: config.reasoningFamily
  })

  if (kind === "gateway") {
    return createGateway({
      apiKey,
      baseURL: baseURL || undefined,
      headers,
      ...(fetchImpl ? { fetch: fetchImpl } : {})
    }).languageModel(config.modelId) as LanguageModel
  }
  if (kind === "google") {
    return createGoogle({
      apiKey,
      baseURL: baseURL || undefined,
      headers,
      ...(fetchImpl ? { fetch: fetchImpl } : {})
    })(config.modelId)
  }
  if (kind === "anthropic") {
    return createAnthropic(connection)(config.modelId)
  }
  if (kind === "deepseek") {
    return createDeepSeek(connection)(config.modelId)
  }
  if (kind === "openai-compatible") {
    return createOpenAICompatible({
      name: OPENAI_COMPAT_NAME,
      apiKey,
      baseURL: baseURL || "https://api.openai.com/v1",
      headers,
      includeUsage: true,
      ...(fetchImpl ? { fetch: fetchImpl } : {})
    }).chatModel(config.modelId)
  }

  const openai = createOpenAI(connection)
  if (kind === "openai-responses") {
    return openai.responses(config.modelId)
  }
  return openai(config.modelId)
}
