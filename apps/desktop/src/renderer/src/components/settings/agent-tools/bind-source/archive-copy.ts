/**
 * 「这个助手用」档案行文案：主行只写用户起的档案名，副行写品牌或密钥态。
 * 禁止把模型 id 拼进账号触发器，否则两只下拉都长得像 deepseek-flash。
 * 品牌名本地表，不 import presets（node 测试解析不了无后缀的 presets 内部 import）。
 */

const KIND_BRAND: Record<string, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  ollama: "Ollama",
  google: "Gemini",
  kimi: "Kimi",
  zhipu: "GLM",
  qwen: "Qwen",
  groq: "Groq",
  siliconflow: "SiliconFlow",
  minimax: "MiniMax"
}

type TranslateFn = (path: string, vars?: Record<string, string | number>) => string

/** 档案 kind → 品牌名。自定义端点不套英文 Custom endpoint。 */
export function archiveBrandName(kind: string): string | undefined {
  if (!kind) return undefined
  return KIND_BRAND[kind]
}

/** 账号行副标题：有品牌且不等于档案名时写「DeepSeek 档案」，否则写密钥态。 */
export function archiveSubtitle(
  profile: { kind: string; name: string; hasKey: boolean },
  t: TranslateFn
): string {
  if (!profile.hasKey) return t("settings.agentTools.bindAccountNoKey")
  const brand = archiveBrandName(profile.kind)
  const name = profile.name.trim()
  if (brand && brand.toLowerCase() !== name.toLowerCase()) {
    return t("settings.agentTools.bindAccountBrandArchive", { brand })
  }
  return t("settings.agentTools.bindAccountKeySaved")
}
