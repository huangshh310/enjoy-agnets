/**
 * createProviderRegistry：按 `provider:model` 解析，并套语言模型中间件。
 */
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createProviderRegistry, type LanguageModel } from "ai"
import { parseHeaders, resolvedBaseURL } from "./config"
import { wrapWithDefaults } from "./middleware"
import { presetFor } from "./presets"
import type { ProviderConfig } from "./types"

export type ModelAlias = {
  alias: string
  providerId: string
  modelId: string
}

export function resolveModelAlias(
  aliases: ModelAlias[],
  requested: string
): { providerId?: string; modelId: string } {
  const hit = aliases.find((item) => item.alias === requested)
  if (hit) return { providerId: hit.providerId, modelId: hit.modelId }
  const slashed = requested.split("/")
  if (slashed.length === 2 && slashed[0] && slashed[1]) {
    return { providerId: slashed[0], modelId: slashed[1] }
  }
  return { modelId: requested }
}

export function createEnjoyRegistry(config: Omit<ProviderConfig, "modelId">) {
  const connection = openaiConnection(config)
  const registry = createProviderRegistry({
    openai: createOpenAI(connection),
    anthropic: createAnthropic(connection)
  })
  return {
    languageModel(id: string): LanguageModel {
      const model = registry.languageModel(id as never) as LanguageModel
      return wrapWithDefaults(model, {
        temperature: config.temperature,
        maxTokens: config.maxTokens
      })
    }
  }
}

function openaiConnection(config: Omit<ProviderConfig, "modelId">) {
  const preset = presetFor(config.provider)
  return {
    apiKey: config.apiKey || (preset.requiresKey ? "" : "ollama"),
    baseURL: resolvedBaseURL(config) || undefined,
    headers: parseHeaders(config.customHeaders)
  }
}
