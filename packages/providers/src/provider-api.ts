/**
 * 给 uploadFile / uploadSkill 用的 Provider 实例。返回 unknown，避免泄漏 SDK 内部类型。
 */
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { parseHeaders, resolvedBaseURL } from "./config.ts"
import { presetFor } from "./presets.ts"
import type { ProviderConfig } from "./types.ts"

function connection(config: ProviderConfig) {
  const preset = presetFor(config.provider)
  return {
    apiKey: config.apiKey || (preset.requiresKey ? "" : "ollama"),
    baseURL: resolvedBaseURL(config) || undefined,
    headers: parseHeaders(config.customHeaders)
  }
}

export function createFilesApi(config: ProviderConfig): unknown {
  return createOpenAI(connection(config))
}

export function createSkillsApi(config: ProviderConfig): unknown {
  return createAnthropic(connection(config))
}
