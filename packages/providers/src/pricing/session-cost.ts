/**
 * 把各 run 的 usage 档案加成会话合计。
 * 只统计已结束的 Enjoy Local agent；缺用量按运行时归类，不把 workflow / 生图 / 还在跑的算进未知。
 */
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract/agent-tools"
import { isCustomAgentId } from "@enjoy-agents/ipc-contract/custom-agent"
import {
  summarizeSessionCosts,
  type SessionEstimatedCost,
  type SessionRunEstimate
} from "@enjoy-agents/ipc-contract/estimated-cost"
import { estimateRunCost, hasPositiveTokens, isLocalUnbilledKind } from "./estimate.ts"
import type { PriceSnapshot, TokenUsage, UserModelRates } from "./types.ts"

const FINISHED = new Set(["completed", "failed", "cancelled"])

export type SessionCostRunInput = {
  runId: string
  kind?: string
  status?: string
  usage?: TokenUsage & {
    runtimeId?: string
    providerKind?: string
    modelId?: string
    reportedCostUsd?: number
    userRates?: UserModelRates
    baseURL?: string
  }
  providerKind?: string
  modelId?: string
  userRates?: UserModelRates
  runtimeId?: string
  baseURL?: string
}

export function buildSessionEstimatedCost(input: {
  sessionId: string
  runs: SessionCostRunInput[]
  snapshot?: PriceSnapshot
}): SessionEstimatedCost {
  const runs: SessionRunEstimate[] = []
  for (const run of input.runs) {
    if (!isSessionCostCandidate(run)) continue
    if (!run.usage) {
      const empty = classifyEmptyUsage(run)
      if (empty) runs.push(empty)
      continue
    }
    if (!hasPositiveTokens(run.usage) && !run.usage.usageIncomplete && run.usage.reportedCostUsd == null) {
      continue
    }
    const estimate = estimateRunCost({
      usage: run.usage,
      runtimeId: run.usage.runtimeId ?? run.runtimeId,
      providerKind: run.usage.providerKind ?? run.providerKind,
      modelId: run.usage.modelId ?? run.modelId,
      userRates: run.usage.userRates ?? run.userRates,
      reportedCostUsd: run.usage.reportedCostUsd,
      baseURL: run.usage.baseURL ?? run.baseURL,
      snapshot: input.snapshot
    })
    runs.push({ runId: run.runId, ...estimate })
  }
  return summarizeSessionCosts(input.sessionId, runs)
}

export function isSessionCostCandidate(run: Pick<SessionCostRunInput, "kind" | "status">): boolean {
  if (run.kind != null && run.kind !== "agent") return false
  if (run.status != null && !FINISHED.has(run.status)) return false
  return true
}

function classifyEmptyUsage(run: SessionCostRunInput): SessionRunEstimate | undefined {
  const runtimeId = run.runtimeId ?? run.usage?.runtimeId ?? runtimeFromModelId(run.modelId)
  const providerKind = run.providerKind ?? run.usage?.providerKind
  if (isExternalRuntime(runtimeId)) {
    return { runId: run.runId, status: "not_reported" }
  }
  if (isLocalUnbilledKind(providerKind)) {
    return { runId: run.runId, status: "local_unbilled" }
  }
  if (run.status != null && run.status !== "completed") return undefined
  return { runId: run.runId, status: "unknown", missing: ["usage"] }
}

function isExternalRuntime(runtimeId: string | undefined): boolean {
  if (!runtimeId || runtimeId === "enjoy-local") return false
  return isAcpHostRuntimeId(runtimeId) || isCustomAgentId(runtimeId) || runtimeId === "sandbox-harness"
}

function runtimeFromModelId(modelId: string | undefined): string | undefined {
  if (!modelId) return undefined
  if (modelId.startsWith("cli:")) return modelId.slice(4)
  if (isAcpHostRuntimeId(modelId)) return modelId
  return undefined
}
