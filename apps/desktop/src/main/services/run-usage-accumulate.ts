/**
 * 多泵用量累加（无 db / 合约入口，可供 node:test 静态相对 import）。
 * 每泵先归一 noCache，再累加。ACP 的 token / 花费取最新快照，不累加。
 */

export type UsageAccumulator = {
  inputTokens?: number
  outputTokens?: number
  noCacheTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  reportedCostUsd?: number
  usageIncomplete?: boolean
  maxPumpInputTokens?: number
  /** 各步 input 的最大值，用来判断分档。合计仍用 inputTokens。 */
  maxStepInputTokens?: number
  endedAt?: number
  acpSessionId?: string
}

/** 流式 usage 按泵累加。可选分项先在本泵归一，缺关键输入就标不完整。 */
export function accumulateRunUsage(run: UsageAccumulator, usage: UsageAccumulator): void {
  const pump = normalizePumpUsage(usage)
  if (pump.usageIncomplete) run.usageIncomplete = true
  run.inputTokens = addTokens(run.inputTokens, pump.inputTokens)
  run.outputTokens = addTokens(run.outputTokens, pump.outputTokens)
  run.noCacheTokens = addTokens(run.noCacheTokens, pump.noCacheTokens)
  run.cacheReadTokens = addTokens(run.cacheReadTokens, pump.cacheReadTokens)
  run.cacheWriteTokens = addTokens(run.cacheWriteTokens, pump.cacheWriteTokens)
  run.reasoningTokens = addTokens(run.reasoningTokens, pump.reasoningTokens)
  if (typeof pump.reportedCostUsd === "number" && Number.isFinite(pump.reportedCostUsd)) {
    run.reportedCostUsd = pump.reportedCostUsd
  }
  noteMaxPumpInput(run, pump)
  noteMaxStepInput(run, pump)
}

/** ACP usage_update.used / cost 是会话快照，覆盖为最新一次。 */
export function replaceRunUsage(run: UsageAccumulator, usage: UsageAccumulator): void {
  copyToken(run, usage, "inputTokens")
  copyToken(run, usage, "outputTokens")
  copyToken(run, usage, "noCacheTokens")
  copyToken(run, usage, "cacheReadTokens")
  copyToken(run, usage, "cacheWriteTokens")
  copyToken(run, usage, "reasoningTokens")
  if (typeof usage.reportedCostUsd === "number" && Number.isFinite(usage.reportedCostUsd)) {
    run.reportedCostUsd = usage.reportedCostUsd
  }
  if (usage.usageIncomplete) run.usageIncomplete = true
  copyToken(run, usage, "maxPumpInputTokens")
  copyToken(run, usage, "maxStepInputTokens")
  copyToken(run, usage, "endedAt")
  if (typeof usage.acpSessionId === "string" && usage.acpSessionId.trim()) {
    run.acpSessionId = usage.acpSessionId.trim()
  }
}

export function markPumpMissingUsage(run: UsageAccumulator): void {
  run.usageIncomplete = true
}

export function normalizePumpUsage(usage: UsageAccumulator): UsageAccumulator {
  const next = { ...usage }
  const noCache = noCacheOf(usage)
  if (noCache !== undefined) next.noCacheTokens = noCache
  else if (hasFinite(usage.outputTokens) && !hasFinite(usage.inputTokens)) {
    next.usageIncomplete = true
  }
  const reasoning = reasoningOf(usage)
  if (reasoning !== undefined) next.reasoningTokens = reasoning
  if (hasFinite(usage.inputTokens)) next.maxPumpInputTokens = usage.inputTokens
  return next
}

function noteMaxPumpInput(run: UsageAccumulator, pump: UsageAccumulator): void {
  const pumpInput = hasFinite(pump.maxPumpInputTokens)
    ? pump.maxPumpInputTokens
    : hasFinite(pump.inputTokens)
      ? pump.inputTokens
      : undefined
  if (pumpInput === undefined) return
  run.maxPumpInputTokens = Math.max(run.maxPumpInputTokens ?? 0, pumpInput)
}

function noteMaxStepInput(run: UsageAccumulator, pump: UsageAccumulator): void {
  if (!hasFinite(pump.maxStepInputTokens)) return
  run.maxStepInputTokens = Math.max(run.maxStepInputTokens ?? 0, pump.maxStepInputTokens as number)
}

function noCacheOf(usage: UsageAccumulator): number | undefined {
  if (hasFinite(usage.noCacheTokens)) return Math.max(0, usage.noCacheTokens as number)
  if (!hasFinite(usage.inputTokens)) return undefined
  return Math.max(0, (usage.inputTokens as number) - cachePart(usage.cacheReadTokens) - cachePart(usage.cacheWriteTokens))
}

function reasoningOf(usage: UsageAccumulator): number | undefined {
  if (hasFinite(usage.reasoningTokens)) return Math.max(0, usage.reasoningTokens as number)
  if (!hasFinite(usage.outputTokens)) return undefined
  return 0
}

function cachePart(value: number | undefined): number {
  return hasFinite(value) && (value as number) > 0 ? (value as number) : 0
}

function addTokens(prev: number | undefined, next: number | undefined): number | undefined {
  if (prev === undefined && next === undefined) return undefined
  return (prev ?? 0) + (next ?? 0)
}

function copyToken(run: UsageAccumulator, usage: UsageAccumulator, key: keyof UsageAccumulator): void {
  const value = usage[key]
  if (typeof value === "number" && Number.isFinite(value)) {
    ;(run as Record<string, unknown>)[key] = value
  }
}

function hasFinite(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value)
}
