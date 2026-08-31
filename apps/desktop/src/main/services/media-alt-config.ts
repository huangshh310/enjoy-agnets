/**
 * 媒体失败时解析第二条配置：同族模型或已存官方媒体档案。
 */
import {
  fallbackKindsFor,
  pickMediaFallbackConfig,
  presetFor,
  type ProviderConfig
} from "@enjoy-agents/providers"
import { findProfileByKinds } from "./secrets"

export async function resolveMediaFallback(
  config: ProviderConfig,
  capability: "image" | "speech" | "transcription" | "video",
  alternateModelId: string
): Promise<ProviderConfig> {
  const profile = await findProfileByKinds(fallbackKindsFor(capability))
  return pickMediaFallbackConfig(
    config,
    alternateModelId,
    profile
      ? {
          kind: profile.kind,
          apiKey: profile.apiKey,
          modelId: profile.modelId || presetFor(profile.kind).models[0]?.id,
          baseURL: profile.baseURL
        }
      : undefined
  )
}
