/**
 * 把本轮 usage 分项落到 runs.usage_json，供会话合计重算。
 */
import { getRun, updateRun } from "@enjoy-agents/db"
import type { TokenUsage } from "@enjoy-agents/providers/pricing"
import type { ActiveRun } from "./agent-run-state"
import { getDatabase } from "./database"

export type RunUsageRecord = TokenUsage & {
  runtimeId?: string
  providerKind?: string
  modelId?: string
  reportedCostUsd?: number
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
  writeRunUsage(runId, {
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    cacheReadTokens: run.cacheReadTokens,
    cacheWriteTokens: run.cacheWriteTokens,
    reasoningTokens: run.reasoningTokens,
    reportedCostUsd: run.reportedCostUsd,
    runtimeId: run.input.runtimeId,
    providerKind: run.secret?.provider,
    modelId: run.input.modelId ?? run.secret?.modelId
  })
}

/** 流式 usage 叠到 ActiveRun，缺项保持未知，不要写成 0。 */
export function applyActiveRunUsage(
  runId: string,
  run: ActiveRun,
  usage: Omit<RunUsageRecord, "runtimeId" | "providerKind" | "modelId">
): void {
  run.inputTokens = usage.inputTokens ?? run.inputTokens
  run.outputTokens = usage.outputTokens ?? run.outputTokens
  run.cacheReadTokens = usage.cacheReadTokens ?? run.cacheReadTokens
  run.cacheWriteTokens = usage.cacheWriteTokens ?? run.cacheWriteTokens
  run.reasoningTokens = usage.reasoningTokens ?? run.reasoningTokens
  run.reportedCostUsd = usage.reportedCostUsd ?? run.reportedCostUsd
  persistRunUsageFromActive(runId, run)
}
