/**
 * CLI 模型行图标：有族名画模型族（含绑了中转的 deepseek-*）；无族名才回落引擎标。
 */
import { providerKeyOf } from "./cli-model-groups.ts"

export function cliModelIconMode(agentId: string, modelId: string, label = ""): "family" | "engine" {
  if (cliModelFamilyKey(modelId, label)) return "family"
  return agentId === "omp" || modelId.includes("/") ? "family" : "engine"
}

/** 交给 ModelBrandIcon：完整 selector + 展示名，斜杠后的短 id 也能匹配 gpt-。 */
export function cliModelIconQuery(model: { id: string; label: string }): {
  modelId: string
  providerKind?: string
} {
  const providerKind = providerKeyOf(model.id) || undefined
  return { modelId: `${model.id} ${model.label}`.trim(), providerKind }
}

/** 锁住截图里的 Claude / Gemini，避免再回落到 omp 灰圆。 */
export function cliModelFamilyKey(modelId: string, label = ""): string | null {
  const text = `${modelId} ${label}`.toLowerCase()
  const slug = modelId.includes("/") ? modelId.slice(modelId.lastIndexOf("/") + 1).toLowerCase() : text
  if (/claude|sonnet|opus|haiku/.test(text)) return "claude"
  if (text.includes("gemini")) return "gemini"
  if (slug.startsWith("gpt-") || text.includes("chatgpt") || /(?:^|\/)o[134]/.test(text)) return "openai"
  if (text.includes("grok")) return "grok"
  if (text.includes("deepseek")) return "deepseek"
  if (text.includes("qwen")) return "qwen"
  if (text.includes("kimi") || text.includes("moonshot")) return "kimi"
  if (/glm|zhipu|chatglm/.test(text)) return "glm"
  if (text.includes("minimax") || text.includes("abab")) return "minimax"
  if (/mistral|codestral|pixtral/.test(text)) return "mistral"
  if (text.includes("perplexity") || text.includes("sonar")) return "perplexity"
  return null
}

/** 无族名时回落引擎标，不要走 ProviderIcon 插头。 */
export function cliModelEngineFallback(agentId: string, modelId: string): string {
  const provider = providerKeyOf(modelId)
  if (provider.includes("antigravity")) return "antigravity"
  if (provider === "anthropic" || provider.includes("claude")) return "claude"
  if (provider === "openai" || provider.includes("codex")) return "codex"
  if (provider.includes("gemini") || provider === "google") return "gemini"
  if (provider.includes("grok") || provider.includes("xai")) return "grok"
  if (provider.includes("deepseek")) return "deepseek"
  return agentId
}
