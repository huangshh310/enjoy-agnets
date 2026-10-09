/**
 * 多泵用量累加（无 db / 合约入口，可供 node:test 静态相对 import）。
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
}

/** 流式 usage 按泵累加。ACP 上报花费取最新一次，不当累计再加。 */
export function accumulateRunUsage(run: UsageAccumulator, usage: UsageAccumulator): void {
  run.inputTokens = addTokens(run.inputTokens, usage.inputTokens)
  run.outputTokens = addTokens(run.outputTokens, usage.outputTokens)
  run.noCacheTokens = addTokens(run.noCacheTokens, usage.noCacheTokens)
  run.cacheReadTokens = addTokens(run.cacheReadTokens, usage.cacheReadTokens)
  run.cacheWriteTokens = addTokens(run.cacheWriteTokens, usage.cacheWriteTokens)
  run.reasoningTokens = addTokens(run.reasoningTokens, usage.reasoningTokens)
  if (typeof usage.reportedCostUsd === "number" && Number.isFinite(usage.reportedCostUsd)) {
    run.reportedCostUsd = usage.reportedCostUsd
  }
}

export function markPumpMissingUsage(run: UsageAccumulator): void {
  run.usageIncomplete = true
}

function addTokens(prev: number | undefined, next: number | undefined): number | undefined {
  if (prev === undefined && next === undefined) return undefined
  return (prev ?? 0) + (next ?? 0)
}
