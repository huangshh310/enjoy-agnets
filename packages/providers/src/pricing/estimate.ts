/**
 * usage × 单价。缺一个计费必需的量或单价 → 整次 unknown。
 * 本地模型不计费；ACP 没上报花费就不显示。
 */
import type { CostMissingItem, CostSource, EstimatedCost } from "@enjoy-agents/ipc-contract/estimated-cost"
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract/agent-tools"
import { isCustomAgentId } from "@enjoy-agents/ipc-contract/custom-agent"
import { matchModelRate } from "./match.ts"
import type { PriceSnapshot, TokenUsage, UserModelRates } from "./types.ts"

const LOCAL_UNBILLED = new Set(["ollama", "lmstudio"])

const LINES = [
  { token: "inputTokens", rate: "input", missing: "input" },
  { token: "outputTokens", rate: "output", missing: "output" },
  { token: "cacheReadTokens", rate: "cacheRead", missing: "cacheRead" },
  { token: "cacheWriteTokens", rate: "cacheWrite", missing: "cacheWrite" },
  { token: "reasoningTokens", rate: "reasoning", missing: "reasoning" }
] as const

export function isLocalUnbilledKind(kind: string | undefined): boolean {
  return Boolean(kind && LOCAL_UNBILLED.has(kind))
}

export function estimateRunCost(input: {
  usage: TokenUsage
  runtimeId?: string
  providerKind?: string
  modelId?: string
  userRates?: UserModelRates
  reportedCostUsd?: number
  snapshot?: PriceSnapshot
}): EstimatedCost {
  if (isExternalEngine(input.runtimeId)) {
    return reportedOrHidden(input.reportedCostUsd)
  }
  if (isLocalUnbilledKind(input.providerKind)) {
    return { status: "local_unbilled" }
  }
  const matched = matchModelRate({
    providerKind: input.providerKind ?? "",
    modelId: input.modelId ?? "",
    userRates: input.userRates,
    snapshot: input.snapshot
  })
  if (!matched) return { status: "unknown", missing: ["price"] }
  const missing: CostMissingItem[] = []
  let usd = 0
  let billed = false
  for (const line of LINES) {
    const tokens = input.usage[line.token]
    if (typeof tokens !== "number" || !Number.isFinite(tokens) || tokens <= 0) continue
    const price = matched.rate[line.rate]
    if (price === undefined) {
      missing.push(line.missing)
      continue
    }
    usd += (tokens / 1_000_000) * price
    billed = true
  }
  if (missing.length > 0) return { status: "unknown", missing, source: matched.source }
  if (!billed) return { status: "unknown", missing: ["price"] }
  return {
    status: "estimated",
    usd,
    source: matched.source as CostSource,
    snapshotDate: matched.snapshotDate,
    snapshotVersion: matched.snapshotVersion
  }
}

function isExternalEngine(runtimeId: string | undefined): boolean {
  if (!runtimeId || runtimeId === "enjoy-local") return false
  return isAcpHostRuntimeId(runtimeId) || isCustomAgentId(runtimeId) || runtimeId === "sandbox-harness"
}

function reportedOrHidden(reported: number | undefined): EstimatedCost {
  if (typeof reported === "number" && Number.isFinite(reported)) {
    return { status: "reported", usd: reported, source: "engine" }
  }
  return { status: "not_reported" }
}
