/**
 * 预设 kind 白名单。未知值在读档时不要当成空 vault。
 */
export const PROVIDER_KINDS = [
  "deepseek",
  "openai",
  "anthropic",
  "openrouter",
  "ollama",
  "google",
  "kimi",
  "zhipu",
  "zai",
  "qwen",
  "groq",
  "siliconflow",
  "minimax",
  "doubao",
  "wenxin",
  "hunyuan",
  "stepfun",
  "zeroone",
  "baichuan",
  "spark",
  "xai",
  "xiaomi",
  "mistral",
  "together",
  "perplexity",
  "modelscope",
  "aihubmix",
  "lmstudio",
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

export function isProviderKind(value: string): value is ProviderKind {
  return (PROVIDER_KINDS as readonly string[]).includes(value)
}
