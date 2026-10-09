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
  endedAt?: number
  usage?: TokenUsage & {
    runtimeId?: string
    acpSessionId?: string
    endedAt?: number
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
  acpSessionId?: string
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
    if (!run.usage || isBlankUsage(run.usage)) {
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
    runs.push(
      withCostIds(
        { runId: run.runId, ...estimate, ...(endedAtOf(run) != null ? { endedAt: endedAtOf(run) } : {}) },
        run
      )
    )
  }
  return summarizeSessionCosts(input.sessionId, runs)
}

export function isSessionCostCandidate(run: Pick<SessionCostRunInput, "kind" | "status">): boolean {
  if (run.kind != null && run.kind !== "agent") return false
  if (run.status != null && !FINISHED.has(run.status)) return false
  return true
}

/** 只有元数据、没有 token / 上报 / 不完整标记：不是明确的 0 token。 */
function isBlankUsage(usage: TokenUsage & { reportedCostUsd?: number }): boolean {
  return (
    usage.inputTokens == null &&
    usage.outputTokens == null &&
    usage.noCacheTokens == null &&
    usage.cacheReadTokens == null &&
    usage.cacheWriteTokens == null &&
    usage.reasoningTokens == null &&
    usage.reportedCostUsd == null &&
    usage.usageIncomplete !== true
  )
}

function classifyEmptyUsage(run: SessionCostRunInput): SessionRunEstimate | undefined {
  const runtimeId = run.runtimeId ?? run.usage?.runtimeId ?? runtimeFromModelId(run.modelId)
  const providerKind = run.providerKind ?? run.usage?.providerKind
  if (isExternalRuntime(runtimeId)) {
    return withCostIds(withEndedAt({ runId: run.runId, status: "not_reported" }, endedAtOf(run)), run)
  }
  if (isLocalUnbilledKind(providerKind)) {
    return withCostIds(withEndedAt({ runId: run.runId, status: "local_unbilled" }, endedAtOf(run)), run)
  }
  if (run.status != null && run.status !== "completed") return undefined
  return withCostIds(withEndedAt({ runId: run.runId, status: "unknown", missing: ["usage"] }, endedAtOf(run)), run)
}

function endedAtOf(run: SessionCostRunInput): number | undefined {
  return run.usage?.endedAt ?? run.endedAt
}

function withEndedAt(row: SessionRunEstimate, endedAt: number | undefined): SessionRunEstimate {
  return endedAt == null ? row : { ...row, endedAt }
}

function withCostIds(row: SessionRunEstimate, run: SessionCostRunInput): SessionRunEstimate {
  const runtimeId = run.usage?.runtimeId ?? run.runtimeId
  const acpSessionId = run.usage?.acpSessionId ?? run.acpSessionId
  return {
    ...row,
    ...(runtimeId ? { runtimeId } : {}),
    ...(acpSessionId ? { acpSessionId } : {})
  }
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
