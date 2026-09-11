/**
 * 从未知 JSON 抽出 token 字段。只认官方键名，不按模型 id 猜窗口。
 */
/** Codex 自定义上游、没有 model 字段时的桶 key。renderer 翻成词表，不要直接画出来。 */
export const CUSTOM_UPSTREAM_MODEL_KEY = "custom-upstream"

export type UsageDelta = {
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  totalTokens: number
  model?: string
  day?: string
  project?: string
  sourceId?: string
  costUsdTicks?: number
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function intField(record: Record<string, unknown> | null, key: string): number {
  if (!record) return 0
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

/** 键缺失、非有限数、负数 → undefined。显式 0 → 0。 */
export function optionalIntField(
  record: Record<string, unknown> | null,
  key: string
): number | undefined {
  if (!record || !(key in record)) return undefined
  const value = record[key]
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined
  return Math.floor(value)
}

export function stringField(record: Record<string, unknown> | null, key: string): string | undefined {
  if (!record) return undefined
  const value = record[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function dayKeyFromTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length < 10) return undefined
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

/** cwd 只留最后一段目录名，禁止把绝对路径送进 renderer。 */
export function projectLabelFromCwd(cwd: string | undefined): string | undefined {
  if (!cwd?.trim()) return undefined
  const parts = cwd.replaceAll("\\", "/").split("/").filter(Boolean)
  const name = parts.at(-1)?.trim()
  return name || undefined
}

export function usageFromTokenFields(record: Record<string, unknown> | null): UsageDelta | null {
  if (!record) return null
  const snake = usageFromNamedFields(record, {
    input: ["input_tokens"],
    output: ["output_tokens", "reasoning_output_tokens"],
    cache: [
      "cache_read_input_tokens",
      "cache_creation_input_tokens",
      "cached_input_tokens",
      "cache_write_input_tokens"
    ],
    total: "total_tokens"
  })
  if (snake) return snake
  return usageFromNamedFields(record, {
    input: ["input", "inputTokens"],
    output: ["output", "outputTokens"],
    cache: ["cacheRead", "cacheWrite", "cachedReadTokens", "cacheCreationTokens"],
    total: "totalTokens"
  })
}

function usageFromNamedFields(
  record: Record<string, unknown>,
  keys: { input: string[]; output: string[]; cache: string[]; total: string }
): UsageDelta | null {
  const inputTokens = keys.input.reduce((sum, key) => sum + intField(record, key), 0)
  const outputTokens = keys.output.reduce((sum, key) => sum + intField(record, key), 0)
  const cacheTokens = keys.cache.reduce((sum, key) => sum + intField(record, key), 0)
  const totalTokens = intField(record, keys.total)
  if (inputTokens + outputTokens + cacheTokens + totalTokens <= 0) return null
  return {
    inputTokens,
    outputTokens,
    cacheTokens,
    totalTokens: totalTokens || inputTokens + outputTokens + cacheTokens
  }
}

export function emptyUsage(): UsageDelta {
  return { inputTokens: 0, outputTokens: 0, cacheTokens: 0, totalTokens: 0 }
}

export function addUsage(into: UsageDelta, delta: UsageDelta): UsageDelta {
  return {
    inputTokens: into.inputTokens + delta.inputTokens,
    outputTokens: into.outputTokens + delta.outputTokens,
    cacheTokens: into.cacheTokens + delta.cacheTokens,
    totalTokens: into.totalTokens + delta.totalTokens,
    model: delta.model ?? into.model,
    day: delta.day ?? into.day,
    project: delta.project ?? into.project,
    sourceId: delta.sourceId ?? into.sourceId,
    costUsdTicks: delta.costUsdTicks ?? into.costUsdTicks
  }
}

export function hasAnyTokens(delta: UsageDelta): boolean {
  return delta.totalTokens + delta.inputTokens + delta.outputTokens + delta.cacheTokens > 0
}
