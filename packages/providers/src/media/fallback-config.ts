/**
 * 媒体失败后的第二条路径：先换同族模型 id，再换已配置的官方媒体档案。
 */
import type { ProviderKind } from "../presets.ts"
import type { ProviderConfig } from "../types.ts"

export type MediaAltProfile = {
  kind: ProviderKind
  apiKey: string
  modelId?: string
  baseURL?: string
}

export function pickMediaFallbackConfig(
  current: ProviderConfig,
  alternateModelId: string,
  otherProfile?: MediaAltProfile
): ProviderConfig {
  if (alternateModelId !== current.modelId) {
    return { ...current, modelId: alternateModelId }
  }
  if (otherProfile && otherProfile.kind !== current.provider && otherProfile.apiKey.trim()) {
    return {
      provider: otherProfile.kind,
      apiKey: otherProfile.apiKey,
      modelId: otherProfile.modelId || current.modelId,
      baseURL: otherProfile.baseURL
    }
  }
  return { ...current, modelId: alternateModelId }
}

export function fallbackKindsFor(capability: "image" | "speech" | "transcription" | "video"): ProviderKind[] {
  if (capability === "image" || capability === "video") return ["fal", "replicate"]
  if (capability === "speech") return ["elevenlabs"]
  return ["deepgram"]
}
