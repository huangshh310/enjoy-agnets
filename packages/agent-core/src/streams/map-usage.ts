/**
 * 从 AI SDK / 供应商 usage 抽出分项 token。没返回的字段保持未知，不要写成 0。
 * AI SDK v7：inputTokens 含缓存，outputTokens 含推理；细项在 inputTokenDetails / outputTokenDetails。
 * 不读 Anthropic 原始 `input_tokens` / `cache_read_input_tokens`：那份 input 不含缓存，
 * 下游按 SDK 形状做 input−cache 会少算。
 */
export type MappedTokenUsage = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  noCacheTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
}

export function mapUsageTokens(usage: Record<string, unknown>): MappedTokenUsage | null {
  const inputTokens = numberOf(usage.inputTokens ?? usage.promptTokens)
  const outputTokens = numberOf(usage.outputTokens ?? usage.completionTokens)
  const totalTokens = numberOf(usage.totalTokens) ?? sumTokens(inputTokens, outputTokens)
  const details = asRecord(usage.inputTokenDetails)
  const outDetails = asRecord(usage.outputTokenDetails)
  const noCacheTokens = firstNumber(
    details.noCacheTokens,
    usage.noCacheTokens,
    nested(usage, "inputTokens", "noCache")
  )
  const cacheReadTokens = firstNumber(
    details.cacheReadTokens,
    usage.cacheReadTokens,
    usage.cachedInputTokens,
    nested(usage, "promptTokensDetails", "cachedTokens")
  )
  const cacheWriteTokens = firstNumber(
    details.cacheWriteTokens,
    usage.cacheWriteTokens,
    usage.cacheCreationInputTokens
  )
  const reasoningTokens = firstNumber(
    outDetails.reasoningTokens,
    usage.reasoningTokens,
    nested(usage, "completionTokensDetails", "reasoningTokens")
  )
  if (
    inputTokens == null &&
    outputTokens == null &&
    totalTokens == null &&
    noCacheTokens == null &&
    cacheReadTokens == null &&
    cacheWriteTokens == null &&
    reasoningTokens == null
  ) {
    return null
  }
  return {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
    ...(noCacheTokens !== undefined ? { noCacheTokens } : {}),
    ...(cacheReadTokens !== undefined ? { cacheReadTokens } : {}),
    ...(cacheWriteTokens !== undefined ? { cacheWriteTokens } : {}),
    ...(reasoningTokens !== undefined ? { reasoningTokens } : {})
  }
}

export function numberOf(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = numberOf(value)
    if (parsed !== undefined) return parsed
  }
  return undefined
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function nested(root: Record<string, unknown>, ...path: string[]): unknown {
  let current: unknown = root
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function sumTokens(input?: number, output?: number): number | undefined {
  if (input == null && output == null) return undefined
  return (input ?? 0) + (output ?? 0)
}
