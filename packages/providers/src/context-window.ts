/**
 * 模型上下文窗口解析：只信目录字段，不按 modelId 写死映射表。
 * SDK 7 的 LanguageModel 没有 contextWindow；窗口来自供应商 /models 或 AI Gateway 目录。
 */

export type ContextWindowHints = {
  modelId: string
  provider?: string
  /** 探测 / 用户目录里该条模型自带的窗口 */
  catalogWindow?: number
  /** 供应商档案上手填的窗口（自定义端点兜底） */
  profileWindow?: number
  /** Gateway 公开目录查到的窗口 */
  gatewayWindow?: number
}

const WINDOW_KEYS = [
  "context_window",
  "contextWindow",
  "context_length",
  "contextLength",
  "max_model_len",
  "max_input_tokens",
  "maxInputTokens"
] as const

const OUTPUT_KEYS = ["max_tokens", "maxTokens", "max_output_tokens", "maxOutputTokens"] as const

/** 从供应商 /models 条目里抽出窗口；非法或 0 视为没有。 */
export function parseCatalogContextWindow(raw: unknown): number | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const row = raw as Record<string, unknown>
  for (const key of WINDOW_KEYS) {
    const parsed = asPositiveInt(row[key])
    if (parsed) return parsed
  }
  return undefined
}

/** 从目录条目抽出最大输出 token。 */
export function parseCatalogMaxOutput(raw: unknown): number | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const row = raw as Record<string, unknown>
  for (const key of OUTPUT_KEYS) {
    const parsed = asPositiveInt(row[key])
    if (parsed) return parsed
  }
  return undefined
}

/**
 * 解析当前模型窗口：用户档案手填优先 > 探测目录 > Gateway 目录兜底。
 * 三者都没有则返回 undefined，UI 不得再猜 1M / 200k。
 */
export function resolveModelContextWindow(hints: ContextWindowHints): number | undefined {
  return firstWindow(hints.profileWindow, hints.catalogWindow, hints.gatewayWindow)
}

/** 在 Gateway 条目里按精确 id、provider/id、后缀 id 查找。 */
export function lookupGatewayContextWindow(
  entries: ReadonlyArray<{ id: string; contextWindow?: number }>,
  modelId: string,
  provider?: string
): number | undefined {
  if (!modelId || entries.length === 0) return undefined
  const exact = entries.find((entry) => entry.id === modelId)
  if (exact?.contextWindow) return exact.contextWindow
  if (provider) {
    const prefixed = entries.find((entry) => entry.id === `${provider}/${modelId}`)
    if (prefixed?.contextWindow) return prefixed.contextWindow
  }
  const suffix = `/${modelId}`
  const bySuffix = entries.find((entry) => entry.id.endsWith(suffix))
  return bySuffix?.contextWindow
}

function firstWindow(...values: Array<number | undefined>): number | undefined {
  for (const value of values) {
    const parsed = asPositiveInt(value)
    if (parsed) return parsed
  }
  return undefined
}

function asPositiveInt(value: unknown): number | undefined {
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  if (!Number.isFinite(num) || num <= 0) return undefined
  return Math.round(num)
}
