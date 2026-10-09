/**
 * 把本轮 usage 分项落到 runs.usage_json，供会话合计重算。
 * 多泵累加；有一轮缺用量则整次 unknown。
 */
import { getRun, updateRun } from "@enjoy-agents/db"
import { userRatesFrom, type TokenUsage, type UserModelRates } from "@enjoy-agents/providers/pricing"
import type { ActiveRun } from "./agent-run-state"
import { getDatabase } from "./database"
import { accumulateRunUsage } from "./run-usage-accumulate"

export { accumulateRunUsage, markPumpMissingUsage, type UsageAccumulator } from "./run-usage-accumulate"

export type RunUsageRecord = TokenUsage & {
  runtimeId?: string
  providerKind?: string
  modelId?: string
  reportedCostUsd?: number
  userRates?: UserModelRates
  baseURL?: string
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

export function applyActiveRunUsage(
  runId: string,
  run: ActiveRun,
  usage: Omit<RunUsageRecord, "runtimeId" | "providerKind" | "modelId">
): void {
  accumulateRunUsage(run, usage)
  persistRunUsageFromActive(runId, run)
}
