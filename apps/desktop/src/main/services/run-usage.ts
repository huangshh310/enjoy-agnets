/**
 * 把本轮 usage 分项落到 runs.usage_json，供会话合计重算。
 * 恢复 / 续跑先预填累加器；本地 SDK 按泵累加，ACP 取最新快照。
 */
import { getRun, updateRun } from "@enjoy-agents/db"
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract/agent-tools"
import { userRatesFrom, type TokenUsage, type UserModelRates } from "@enjoy-agents/providers/pricing"
import { getActiveRun, type ActiveRun } from "./agent-run-state"
import { getDatabase } from "./database"
import { accumulateRunUsage, markPumpMissingUsage, replaceRunUsage } from "./run-usage-accumulate"

export {
  accumulateRunUsage,
  markPumpMissingUsage,
  replaceRunUsage,
  type UsageAccumulator
} from "./run-usage-accumulate"

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

/** 恢复 / 续跑：用已有 usage_json 预填空累加器；读不到就标不完整。 */
export function hydrateActiveRunUsage(runId: string): void {
  const run = getActiveRun(runId)
  if (!run || runHasUsage(run)) return
  const row = getRun(getDatabase(), runId)
  if (!row) return
  const usage = parseRunUsage(row.usageJson)
  if (!usage) {
    markPumpMissingUsage(run)
    return
  }
  replaceRunUsage(run, usage)
  if (usage.usageIncomplete) markPumpMissingUsage(run)
}

export function applyActiveRunUsage(
  runId: string,
  run: ActiveRun,
  usage: Omit<RunUsageRecord, "runtimeId" | "providerKind" | "modelId">
): void {
  if (isAcpHostRuntimeId(run.input.runtimeId)) replaceRunUsage(run, usage)
  else accumulateRunUsage(run, usage)
  persistRunUsageFromActive(runId, run)
}

export function finalizePumpUsage(runId: string, run: ActiveRun, sawUsage: boolean): void {
  if (sawUsage) return
  markPumpMissingUsage(run)
  persistRunUsageFromActive(runId, run)
}

function runHasUsage(run: ActiveRun): boolean {
  return (
    run.inputTokens != null ||
    run.outputTokens != null ||
    run.noCacheTokens != null ||
    run.reportedCostUsd != null ||
    run.usageIncomplete === true
  )
}
