/**
 * 把本轮 usage 分项落到 runs.usage_json，供会话合计重算。
 * 多泵累加；有一轮缺用量则整次 unknown。
 */
import { getRun, updateRun } from "@enjoy-agents/db"
import { userRatesFrom, type TokenUsage, type UserModelRates } from "@enjoy-agents/providers/pricing"
import type { ActiveRun } from "./agent-run-state"
import { getDatabase } from "./database"

export type RunUsageRecord = TokenUsage & {
  runtimeId?: string
  providerKind?: string
  modelId?: string
  reportedCostUsd?: number
  userRates?: UserModelRates
  baseURL?: string
}

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

export function parseRunUsage(json: string | null | undefined): RunUsageRecord | undefined {
  if (!json) return undefined
  try {
    const rec = JSON.parse(json) as RunUsageRecord
    return rec && typeof rec === "object" ? rec : undefined
  } catch {
    return undefined
  }
}

export function writeRunUsage(runId: string, usage: RunUsageRecord): void {
  if (!getRun(getDatabase(), runId)) return
  updateRun(getDatabase(), runId, { usageJson: JSON.stringify(usage) })
}

export function persistRunUsageFromActive(runId: string, run: ActiveRun): void {
  const modelId = run.input.modelId ?? run.secret?.modelId
  writeRunUsage(runId, {
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    noCacheTokens: run.noCacheTokens,
    cacheReadTokens: run.cacheReadTokens,
    cacheWriteTokens: run.cacheWriteTokens,
    reasoningTokens: run.reasoningTokens,
    reportedCostUsd: run.reportedCostUsd,
    usageIncomplete: run.usageIncomplete,
    runtimeId: run.input.runtimeId,
    providerKind: run.secret?.provider,
    modelId,
    baseURL: run.secret?.baseURL,
    userRates: userRatesFrom(run.secret?.models?.find((item) => item.id === modelId))
  })
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

export function applyActiveRunUsage(
  runId: string,
  run: ActiveRun,
  usage: Omit<RunUsageRecord, "runtimeId" | "providerKind" | "modelId">
): void {
  accumulateRunUsage(run, usage)
  persistRunUsageFromActive(runId, run)
}

function addTokens(prev: number | undefined, next: number | undefined): number | undefined {
  if (prev === undefined && next === undefined) return undefined
  return (prev ?? 0) + (next ?? 0)
}
