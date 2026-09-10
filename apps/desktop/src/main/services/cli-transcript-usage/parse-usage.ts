/**
 * 从未知 JSON 抽出 token 字段。只认官方键名，不按模型 id 猜窗口。
 */
export type UsageDelta = {
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  totalTokens: number
  model?: string
  day?: string
  project?: string
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
  const inputTokens = intField(record, "input_tokens")
  const outputTokens =
    intField(record, "output_tokens") + intField(record, "reasoning_output_tokens")
  const cacheTokens =
    intField(record, "cache_read_input_tokens") +
    intField(record, "cache_creation_input_tokens") +
    intField(record, "cached_input_tokens") +
    intField(record, "cache_write_input_tokens")
  const totalTokens = intField(record, "total_tokens")
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
    project: delta.project ?? into.project
  }
}
