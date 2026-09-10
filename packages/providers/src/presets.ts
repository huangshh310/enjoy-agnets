import { type ApiStyle } from "./api-styles"
import { MEDIA_PROVIDER_PRESETS } from "./presets-media"

export { isMediaNativeKind, isMediaOnlyKind } from "./presets-media"

export { API_STYLES, API_STYLE_OPTIONS, apiStyleLabel, isApiStyle, type ApiStyle } from "./api-styles"

export const PROVIDER_KINDS = [
  "deepseek",
  "openai",
  "anthropic",
  "openrouter",
  "ollama",
  "google",
  "kimi",
  "zhipu",
  "qwen",
  "groq",
  "siliconflow",
  "minimax",
  "custom",
  "fal",
  "replicate",
  "elevenlabs",
  "deepgram",
  "cohere",
  "gateway"
] as const

export type ProviderKind = (typeof PROVIDER_KINDS)[number]

export function parseProviderKind(value: string): ProviderKind {
  if ((PROVIDER_KINDS as readonly string[]).includes(value)) return value as ProviderKind
  throw new Error("Unknown provider kind.")
}

export type CatalogModel = {
  id: string
  label: string
  /** 该模型自称的上下文窗口（token）；探测 / Gateway 写入，不要按 id 猜 */
  contextWindow?: number
  /** 最大输出 token，目录有则带上 */
  maxOutputTokens?: number
}

export type ProviderPreset = {
  kind: ProviderKind
  name: string
  description: string
  defaultBaseURL: string
  apiStyle: ApiStyle
  requiresKey: boolean
  docsURL?: string
  models: CatalogModel[]
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    kind: "deepseek",
    name: "DeepSeek",
    description: "Official DeepSeek Chat and Reasoner models.",
    defaultBaseURL: "https://api.deepseek.com/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://api-docs.deepseek.com/",
    models: [
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
      { id: "deepseek-chat", label: "DeepSeek Chat (legacy)" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" }
    ]
  },
  {
    kind: "openai",
    name: "OpenAI",
    description: "Official OpenAI API, or any drop-in compatible gateway.",
    defaultBaseURL: "https://api.openai.com/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://platform.openai.com/docs",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { id: "gpt-4o", label: "GPT-4o" }
    ]
  },
  {
    kind: "anthropic",
    name: "Anthropic",
    description: "Claude Messages API.",
    defaultBaseURL: "https://api.anthropic.com",
    apiStyle: "anthropic",
    requiresKey: true,
    docsURL: "https://docs.anthropic.com/",
    models: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-opus-4", label: "Claude Opus 4" }
    ]
  },
  {
    kind: "openrouter",
    name: "OpenRouter",
    description: "One key for many upstream models.",
    defaultBaseURL: "https://openrouter.ai/api/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://openrouter.ai/docs",
    models: [
      { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" }
    ]
  },
  {
    kind: "google",
    name: "Google Gemini",
    description: "Official Gemini API. OpenAI-compatible URLs still work if you keep /openai.",
    defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://ai.google.dev/gemini-api/docs",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }
    ]
  },
  {
    kind: "kimi",
    name: "Kimi / Moonshot",
    description: "Moonshot OpenAI-compatible API.",
    defaultBaseURL: "https://api.moonshot.cn/v1",
    apiStyle: "openai",
    requiresKey: true,
    models: [
      { id: "kimi-k2-turbo-preview", label: "Kimi K2 Turbo" },
      { id: "moonshot-v1-auto", label: "Moonshot Auto" }
    ]
  },
  {
    kind: "zhipu",
    name: "Zhipu GLM",
    description: "BigModel OpenAI-compatible API.",
    defaultBaseURL: "https://open.bigmodel.cn/api/paas/v4",
    apiStyle: "openai",
    requiresKey: true,
    models: [
      { id: "glm-4.6", label: "GLM-4.6" },
      { id: "glm-4-flash", label: "GLM-4 Flash" }
    ]
  },
  {
    kind: "qwen",
    name: "Qwen / DashScope",
    description: "Alibaba Cloud compatible-mode endpoint.",
    defaultBaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiStyle: "openai",
    requiresKey: true,
    models: [
      { id: "qwen-plus", label: "Qwen Plus" },
      { id: "qwen-turbo", label: "Qwen Turbo" },
      { id: "qwen-coder-plus", label: "Qwen Coder Plus" }
    ]
  },
  {
    kind: "groq",
    name: "Groq",
    description: "Fast OpenAI-compatible inference.",
    defaultBaseURL: "https://api.groq.com/openai/v1",
    apiStyle: "openai",
    requiresKey: true,
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" }
    ]
  },
  {
    kind: "siliconflow",
    name: "SiliconFlow",
    description: "China OpenAI-compatible aggregator.",
    defaultBaseURL: "https://api.siliconflow.cn/v1",
    apiStyle: "openai",
    requiresKey: true,
    models: [
      { id: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
      { id: "Qwen/Qwen2.5-72B-Instruct", label: "Qwen2.5 72B" }
    ]
  },
  {
    kind: "minimax",
    name: "MiniMax",
    description: "MiniMax OpenAI-compatible API.",
    defaultBaseURL: "https://api.minimax.chat/v1",
    apiStyle: "openai",
    requiresKey: true,
    models: [{ id: "MiniMax-M2", label: "MiniMax M2" }]
  },
  {
    kind: "ollama",
    name: "Ollama",
    description: "Local models. Key is optional.",
    defaultBaseURL: "http://127.0.0.1:11434/v1",
    apiStyle: "openai",
    requiresKey: false,
    docsURL: "https://ollama.com/",
    models: [
      { id: "llama3.1", label: "Llama 3.1" },
      { id: "qwen2.5-coder", label: "Qwen 2.5 Coder" }
    ]
  },
  {
    kind: "custom",
    name: "Custom endpoint",
    description: "Any third-party host. Pick the protocol it actually speaks.",
    defaultBaseURL: "",
    apiStyle: "openai",
    requiresKey: true,
    models: []
  },
  ...(MEDIA_PROVIDER_PRESETS as ProviderPreset[])
]

export function presetFor(kind: ProviderKind): ProviderPreset {
  return (
    PROVIDER_PRESETS.find((preset) => preset.kind === kind) ??
    PROVIDER_PRESETS.find((preset) => preset.kind === "custom")!
  )
}

export function normalizeBaseURL(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

export {
  adviseCatalogUrl,
  catalogBaseCandidates,
  catalogPersistBase,
  CatalogError,
  htmlCatalogError,
  resolveCatalogBaseURL,
  type CatalogAdvice,
  type CatalogErrorCode
} from "./catalog-url"
