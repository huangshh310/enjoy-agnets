/**
 * 媒体 / Gateway 官方 preset：生图、语音、转写、视频、rerank。
 * 探测不走 OpenAI /models；生成时走对应 @ai-sdk/* 工厂。
 */
import type { ApiStyle } from "./api-styles"

export const MEDIA_NATIVE_KINDS = [
  "fal",
  "replicate",
  "elevenlabs",
  "deepgram",
  "cohere",
  "gateway"
] as const

export type MediaNativeKind = (typeof MEDIA_NATIVE_KINDS)[number]

type MediaPreset = {
  kind: MediaNativeKind
  name: string
  description: string
  defaultBaseURL: string
  apiStyle: ApiStyle
  requiresKey: boolean
  docsURL?: string
  models: { id: string; label: string }[]
}

export function isMediaNativeKind(kind: string): kind is MediaNativeKind {
  return (MEDIA_NATIVE_KINDS as readonly string[]).includes(kind)
}

/** 不能当聊天 LanguageModel 的 kind。Gateway 仍走语言模型。 */
export function isMediaOnlyKind(kind: string): boolean {
  return kind === "fal" || kind === "replicate" || kind === "elevenlabs" || kind === "deepgram" || kind === "cohere"
}

export const MEDIA_PROVIDER_PRESETS: MediaPreset[] = [
  {
    kind: "fal",
    name: "Fal",
    description: "Official fal.ai image and experimental video models.",
    defaultBaseURL: "https://fal.run",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://fal.ai/docs",
    models: [
      { id: "fal-ai/flux/schnell", label: "FLUX Schnell" },
      { id: "fal-ai/flux/dev", label: "FLUX Dev" }
    ]
  },
  {
    kind: "replicate",
    name: "Replicate",
    description: "Official Replicate image and experimental video models.",
    defaultBaseURL: "https://api.replicate.com",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://replicate.com/docs",
    models: [{ id: "black-forest-labs/flux-schnell", label: "FLUX Schnell" }]
  },
  {
    kind: "elevenlabs",
    name: "ElevenLabs",
    description: "Official ElevenLabs speech models.",
    defaultBaseURL: "https://api.elevenlabs.io",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://elevenlabs.io/docs",
    models: [
      { id: "eleven_multilingual_v2", label: "Multilingual v2" },
      { id: "eleven_monolingual_v1", label: "Monolingual v1" }
    ]
  },
  {
    kind: "deepgram",
    name: "Deepgram",
    description: "Official Deepgram transcription models.",
    defaultBaseURL: "https://api.deepgram.com",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://developers.deepgram.com",
    models: [{ id: "nova-3", label: "Nova 3" }]
  },
  {
    kind: "cohere",
    name: "Cohere",
    description: "Official Cohere embeddings and rerank.",
    defaultBaseURL: "https://api.cohere.com",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.cohere.com",
    models: [
      { id: "embed-english-v3.0", label: "Embed English v3" },
      { id: "rerank-english-v3.0", label: "Rerank English v3" }
    ]
  },
  {
    kind: "gateway",
    name: "AI Gateway",
    description: "Vercel AI Gateway. Optional cloud adapter, not required.",
    defaultBaseURL: "https://ai-gateway.vercel.sh/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://vercel.com/docs/ai-gateway",
    models: [{ id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini via Gateway" }]
  }
]
