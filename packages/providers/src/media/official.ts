/**
 * 官方媒体 SDK 工厂。只在 main 用；失败时由调用方回落 OpenAI 兼容。
 */
import { createFal } from "@ai-sdk/fal"
import { createReplicate } from "@ai-sdk/replicate"
import { createElevenLabs } from "@ai-sdk/elevenlabs"
import { createDeepgram } from "@ai-sdk/deepgram"
import { createCohere } from "@ai-sdk/cohere"
import type { ProviderConfig } from "../types"
import { mediaFactoryKind } from "./factory-kind"

function keyOf(config: ProviderConfig): string {
  return config.apiKey || ""
}

export function createOfficialImageModel(config: ProviderConfig): unknown | undefined {
  const factory = mediaFactoryKind(config.provider, "image")
  if (factory === "fal") return createFal({ apiKey: keyOf(config) }).image(config.modelId)
  if (factory === "replicate") return createReplicate({ apiToken: keyOf(config) }).image(config.modelId)
  return undefined
}

export function createOfficialSpeechModel(config: ProviderConfig): unknown | undefined {
  if (mediaFactoryKind(config.provider, "speech") !== "elevenlabs") return undefined
  return createElevenLabs({ apiKey: keyOf(config) }).speech(config.modelId)
}

export function createOfficialTranscriptionModel(config: ProviderConfig): unknown | undefined {
  if (mediaFactoryKind(config.provider, "transcription") !== "deepgram") return undefined
  return createDeepgram({ apiKey: keyOf(config) }).transcription(config.modelId)
}

export function createOfficialEmbeddingModel(config: ProviderConfig): unknown | undefined {
  if (mediaFactoryKind(config.provider, "embedding") !== "cohere") return undefined
  return createCohere({ apiKey: keyOf(config) }).embedding(config.modelId)
}

export function createOfficialVideoModel(config: ProviderConfig): unknown | undefined {
  const factory = mediaFactoryKind(config.provider, "video")
  if (factory === "fal") return createFal({ apiKey: keyOf(config) }).video(config.modelId)
  if (factory === "replicate") return createReplicate({ apiToken: keyOf(config) }).video(config.modelId)
  return undefined
}
