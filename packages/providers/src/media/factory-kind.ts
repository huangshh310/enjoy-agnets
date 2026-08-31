/**
 * 媒体能力走哪条官方工厂。未知 kind 回落 OpenAI 兼容。
 */
export type MediaFactoryKind = "openai-compat" | "fal" | "replicate" | "elevenlabs" | "deepgram" | "cohere"

export type MediaCapability = "image" | "speech" | "transcription" | "video" | "embedding"

export function mediaFactoryKind(provider: string, capability: MediaCapability): MediaFactoryKind {
  if (capability === "image" || capability === "video") {
    if (provider === "fal") return "fal"
    if (provider === "replicate") return "replicate"
  }
  if (capability === "speech" && provider === "elevenlabs") return "elevenlabs"
  if (capability === "transcription" && provider === "deepgram") return "deepgram"
  if (capability === "embedding" && provider === "cohere") return "cohere"
  return "openai-compat"
}
