/**
 * 把各 run 的 usage 档案加成会话合计。计价走 estimateRunCost。
 */
import {
  summarizeSessionCosts,
  type SessionEstimatedCost,
  type SessionRunEstimate
} from "@enjoy-agents/ipc-contract/estimated-cost"
import { estimateRunCost } from "./estimate.ts"
import type { PriceSnapshot, TokenUsage, UserModelRates } from "./types.ts"

export type SessionCostRunInput = {
  runId: string
  usage?: TokenUsage & {
    runtimeId?: string
    providerKind?: string
    modelId?: string
    reportedCostUsd?: number
  }
  providerKind?: string
  modelId?: string
  userRates?: UserModelRates
  runtimeId?: string
}

export function buildSessionEstimatedCost(input: {
  sessionId: string
  runs: SessionCostRunInput[]
  snapshot?: PriceSnapshot
}): SessionEstimatedCost {
  const runs: SessionRunEstimate[] = []
  for (const run of input.runs) {
    if (!run.usage) continue
    const estimate = estimateRunCost({
      usage: run.usage,
      runtimeId: run.usage.runtimeId ?? run.runtimeId,
      providerKind: run.usage.providerKind ?? run.providerKind,
      modelId: run.usage.modelId ?? run.modelId,
      userRates: run.userRates,
      reportedCostUsd: run.usage.reportedCostUsd,
      snapshot: input.snapshot
    })
    runs.push({ runId: run.runId, ...estimate })
  }
  return summarizeSessionCosts(input.sessionId, runs)
}
