/**
 * 图像 / 语音 / 转写 / embedding 模型工厂。只在 main 用，密钥不进 renderer。
 * 官方 kind 走 @ai-sdk/fal 等；其余走 OpenAI 兼容。
 */
import { createOpenAI } from "@ai-sdk/openai"
import { parseHeaders, resolvedBaseURL } from "./config"
import {
  createOfficialEmbeddingModel,
  createOfficialImageModel,
  createOfficialSpeechModel,
  createOfficialTranscriptionModel,
  createOfficialVideoModel
} from "./media/official"
import { presetFor } from "./presets"
import type { ProviderConfig } from "./types"
export { alternateImageModelId, alternateSpeechModelId, alternateTranscriptionModelId } from "./media-alts"
export { mediaFactoryKind } from "./media/factory-kind"
export { createRerankModel, defaultRerankModelId } from "./embeddings/rerank-model"

function openaiConnection(config: ProviderConfig) {
  const preset = presetFor(config.provider)
  const baseURL = resolvedBaseURL(config)
  const apiKey = config.apiKey || (preset.requiresKey ? "" : "ollama")
  return createOpenAI({
    apiKey,
    baseURL: baseURL || undefined,
    headers: parseHeaders(config.customHeaders)
  })
}

/** 返回 SDK 模型对象；类型用 unknown 避免把 @ai-sdk/provider 泄漏到声明文件。 */
export function createImageModel(config: ProviderConfig): unknown {
  return createOfficialImageModel(config) ?? openaiConnection(config).image(config.modelId)
}

export function createSpeechModel(config: ProviderConfig): unknown {
  return createOfficialSpeechModel(config) ?? openaiConnection(config).speech(config.modelId)
}

export function createTranscriptionModel(config: ProviderConfig): unknown {
  return createOfficialTranscriptionModel(config) ?? openaiConnection(config).transcription(config.modelId)
}

export function createEmbeddingModel(config: ProviderConfig): unknown {
  return createOfficialEmbeddingModel(config) ?? openaiConnection(config).embedding(config.modelId)
}

export function createVideoModel(config: ProviderConfig): unknown {
  return createOfficialVideoModel(config) ?? openaiConnection(config).image(config.modelId)
}

export function createTranslationModel(config: ProviderConfig): unknown {
  return openaiConnection(config).translation(config.modelId)
}

export function defaultEmbeddingModelId(kind: string, requested?: string): string {
  if (requested && /embed/i.test(requested)) return requested
  if (kind === "openai" || kind === "openrouter" || kind === "siliconflow" || kind === "custom") {
    return "text-embedding-3-small"
  }
  return requested || "text-embedding-3-small"
}
