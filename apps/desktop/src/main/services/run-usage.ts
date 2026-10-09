/**
 * 把本轮 usage 分项落到 runs.usage_json，供会话合计重算。
 * 恢复 / 续跑先预填累加器；本地 SDK 按泵累加，ACP 取最新快照。
 */
import { getRun, updateRun } from "@enjoy-agents/db"
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract/agent-tools"
import {
  PRICE_SNAPSHOT,
  userRatesFrom,
  type TokenUsage,
  type UserModelRates
} from "@enjoy-agents/providers/pricing"
import { readAcpSessionBind, writeAcpSessionBind } from "./acp-session-bind.ts"
import { getActiveRun, listActiveRuns, type ActiveRun } from "./agent-run-state"
import { getDatabase } from "./database"
import { accumulateRunUsage, markPumpMissingUsage, replaceRunUsage } from "./run-usage-accumulate"

export {
  accumulateRunUsage,
  markPumpMissingUsage,
  replaceRunUsage,
  usageNeverRecorded,
  type UsageAccumulator
} from "./run-usage-accumulate"

export type RunUsageRecord = TokenUsage & {
  runtimeId?: string
  acpSessionId?: string
  endedAt?: number
  providerKind?: string
  modelId?: string
  reportedCostUsd?: number
  userRates?: UserModelRates
  baseURL?: string
  snapshotVersion?: string
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
  const existing = parseRunUsage(getRun(getDatabase(), runId)?.usageJson)
  const acpSessionId = run.acpSessionId ?? acpSessionIdOf(run) ?? existing?.acpSessionId
  if (acpSessionId) run.acpSessionId = acpSessionId
  writeRunUsage(runId, {
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    noCacheTokens: run.noCacheTokens,
    cacheReadTokens: run.cacheReadTokens,
    cacheWriteTokens: run.cacheWriteTokens,
    reasoningTokens: run.reasoningTokens,
    reportedCostUsd: run.reportedCostUsd,
    usageIncomplete: run.usageIncomplete,
    stepInputIncomplete: run.stepInputIncomplete,
    maxPumpInputTokens: run.maxPumpInputTokens,
    maxStepInputTokens: run.maxStepInputTokens,
    endedAt: run.endedAt,
    runtimeId: run.input.runtimeId,
    acpSessionId,
    providerKind: run.secret?.provider,
    modelId,
    baseURL: run.secret?.baseURL,
    userRates: existing?.userRates ?? userRatesFrom(run.secret?.models?.find((item) => item.id === modelId)),
    snapshotVersion: existing?.snapshotVersion ?? PRICE_SNAPSHOT.version
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
  if (usage.stepInputIncomplete) run.stepInputIncomplete = true
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

/** 握手 / fellBack 以最新 ACP 会话为准，覆盖 hydrate 带来的旧 id。 */
export function rememberAcpSessionId(sessionId: string, runtimeId: string, acpSessionId: string): void {
  writeAcpSessionBind(sessionId, runtimeId, acpSessionId)
  for (const { runId, run } of listActiveRuns()) {
    if (run.input.sessionId !== sessionId || run.input.runtimeId !== runtimeId) continue
    run.acpSessionId = acpSessionId
    persistRunUsageFromActive(runId, run)
  }
}

function acpSessionIdOf(run: ActiveRun): string | undefined {
  const bind = readAcpSessionBind(run.input.sessionId)
  if (!bind || bind.runtimeId !== run.input.runtimeId) return undefined
  return bind.acpSessionId
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
