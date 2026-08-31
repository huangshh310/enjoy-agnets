/**
 * 静态能力目录：按模型族给出默认能力，UI 据此禁用控件。
 */
import type { ProviderCapability } from "@enjoy-agents/ipc-contract"

export const ALL_CAPABILITIES: ProviderCapability[] = [
  "text",
  "streaming",
  "reasoning",
  "tools",
  "structured",
  "vision",
  "files",
  "skills",
  "image",
  "embedding",
  "rerank",
  "speech",
  "transcription",
  "realtime",
  "video"
]

const LANGUAGE_CORE: ProviderCapability[] = [
  "text",
  "streaming",
  "reasoning",
  "tools",
  "structured"
]

/** SDK 7 `generateImage` 专用模型，不能当 ToolLoop LanguageModel。 */
export function isImageOnlyModelId(modelId: string): boolean {
  return /imagine-image|dall-e|gpt-image|flux|sdxl|image-edit|image-lite/.test(modelId.toLowerCase())
}

export function isVideoOnlyModelId(modelId: string): boolean {
  return /imagine-video|sora|kling/.test(modelId.toLowerCase())
}

export function staticCapabilitiesFor(modelId: string, kind: string): ProviderCapability[] {
  if (kind === "fal" || kind === "replicate") return ["image", "video"]
  if (kind === "elevenlabs") return ["speech"]
  if (kind === "deepgram") return ["transcription"]
  if (kind === "cohere") return ["embedding", "rerank"]
  const id = modelId.toLowerCase()
  if (isImageOnlyModelId(id)) return ["image"]
  if (isVideoOnlyModelId(id)) return ["video"]
  const caps = new Set<ProviderCapability>(LANGUAGE_CORE)
  if (kind === "gateway") {
    caps.add("image")
    caps.add("embedding")
  }
  if (/(gpt-4o|gpt-5|claude|gemini|grok|qwen-vl|vision)/.test(id)) caps.add("vision")
  if (/(gpt-4o|claude|gemini)/.test(id)) {
    caps.add("files")
    caps.add("skills")
  }
  if (kind === "openai" || /dall-e|gpt-image|flux|sdxl/.test(id)) caps.add("image")
  if (kind === "openai" || /embed|text-embedding/.test(id)) caps.add("embedding")
  if (/rerank|cohere/.test(id) || kind === "cohere") caps.add("rerank")
  if (/tts|speech/.test(id) || kind === "elevenlabs") caps.add("speech")
  if (/whisper|transcri/.test(id) || kind === "deepgram") caps.add("transcription")
  if (/realtime/.test(id)) caps.add("realtime")
  if (/video|sora|kling/.test(id) || kind === "fal") caps.add("video")
  return [...caps]
}

export function capabilityLabel(cap: ProviderCapability): string {
  const labels: Record<ProviderCapability, string> = {
    text: "Text",
    streaming: "Streaming",
    reasoning: "Reasoning",
    tools: "Tools",
    structured: "Structured output",
    vision: "Vision",
    files: "Files",
    skills: "Skills",
    image: "Image generation",
    embedding: "Embeddings",
    rerank: "Rerank",
    speech: "Speech",
    transcription: "Transcription",
    realtime: "Realtime (experimental)",
    video: "Video (experimental)"
  }
  return labels[cap]
}

export function unsupportedReason(cap: ProviderCapability, modelId: string): string {
  return `${modelId} does not advertise ${capabilityLabel(cap)}.`
}
