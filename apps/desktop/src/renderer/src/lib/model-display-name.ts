/**
 * 模型显示名：档案/名单 label → 预设表 → 从 id 读成人话。禁止把 raw id 摊到面上。
 */
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"

const BRAND: Record<string, string> = {
  anthropic: "Anthropic",
  claude: "Claude",
  haiku: "Haiku",
  sonnet: "Sonnet",
  opus: "Opus",
  deepseek: "DeepSeek",
  gpt: "GPT",
  openai: "OpenAI",
  oss: "OSS",
  qwen: "Qwen",
  llama: "Llama",
  grok: "Grok",
  gemini: "Gemini",
  mistral: "Mistral",
  glm: "GLM",
  kimi: "Kimi",
  ollama: "Ollama",
  flash: "Flash",
  turbo: "Turbo",
  plus: "Plus",
  mini: "Mini",
  pro: "Pro",
  chat: "Chat",
  reasoner: "Reasoner",
  coder: "Coder"
}

export function presetModelLabel(id: string): string | undefined {
  const needle = id.trim()
  if (!needle) return undefined
  const leaf = modelIdLeaf(needle)
  for (const preset of PROVIDER_PRESETS) {
    for (const model of preset.models) {
      if (model.id === needle || model.id === leaf) return model.label
      if (modelIdLeaf(model.id) === leaf) return model.label
    }
  }
  return undefined
}

/** 有独立显示名用它；空、等于 raw id、或本身像 id 时先查预设表，再从 id 拼人话。 */
export function resolveModelDisplayName(id: string, label?: string | null): string {
  const trimmedId = id.trim()
  const trimmedLabel = (label ?? "").trim()
  if (trimmedLabel && !looksLikeRawModelId(trimmedLabel, trimmedId)) return trimmedLabel
  const fromPreset = presetModelLabel(trimmedId) ?? (trimmedLabel ? presetModelLabel(trimmedLabel) : undefined)
  if (fromPreset) return fromPreset
  return humanizeModelId(trimmedId || trimmedLabel)
}

export function humanizeModelId(id: string): string {
  const leaf = modelIdLeaf(id)
  if (!leaf) return id.trim()
  if (!/[-_/]/.test(leaf) && !/\d+\.\d+/.test(leaf)) return titleCompact(leaf)
  return mergeVersionTokens(splitModelTokens(leaf)).map(prettyToken).join(" ")
}

function modelIdLeaf(id: string): string {
  const trimmed = id.trim()
  return trimmed.split("/").pop() ?? trimmed
}

function looksLikeRawModelId(label: string, id: string): boolean {
  if (sameModelId(label, id)) return true
  if (label.includes(" ")) return false
  return /[-_/]/.test(label) && label === label.toLowerCase()
}

function sameModelId(label: string, id: string): boolean {
  return label.toLowerCase() === id.toLowerCase() || label.toLowerCase() === modelIdLeaf(id).toLowerCase()
}

function splitModelTokens(leaf: string): string[] {
  return leaf
    .replace(/([A-Za-z])(\d)/g, "$1-$2")
    .replace(/(\d)([A-Za-z])/g, "$1-$2")
    .split(/[-_]+/)
    .filter(Boolean)
}

function mergeVersionTokens(tokens: string[]): string[] {
  const next: string[] = []
  for (const token of tokens) {
    const last = next.at(-1)
    if (last && isVersionPart(last) && isVersionPart(token)) {
      next[next.length - 1] = `${last}.${token}`
      continue
    }
    next.push(token)
  }
  return next
}

function isVersionPart(token: string): boolean {
  return /^\d+$/.test(token)
}

function prettyToken(token: string): string {
  const lower = token.toLowerCase()
  if (BRAND[lower]) return BRAND[lower]
  if (/^v\d/i.test(token)) return `V${token.slice(1)}`
  if (/^\d/.test(token)) return token
  return token.charAt(0).toUpperCase() + token.slice(1)
}

function titleCompact(leaf: string): string {
  if (leaf.length <= 1) return leaf.toUpperCase()
  return leaf.charAt(0).toUpperCase() + leaf.slice(1)
}
