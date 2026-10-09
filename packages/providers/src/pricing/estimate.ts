/**
 * usage × 单价。input 只乘 noCache；reasoning 默认含在 output。
 * 有缓存 token 但缺缓存单价 → 整次 unknown。缺推理单价不算未知。
 */
import type { CostMissingItem, CostSource, EstimatedCost } from "@enjoy-agents/ipc-contract/estimated-cost"
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract/agent-tools"
import { isCustomAgentId } from "@enjoy-agents/ipc-contract/custom-agent"
import { matchModelRate } from "./match.ts"
import { hasUserRates, isOfficialProviderEndpoint } from "./official-endpoint.ts"
import type { ModelRate, PriceSnapshot, TokenUsage, UserModelRates } from "./types.ts"

const LOCAL_UNBILLED = new Set(["ollama", "lmstudio"])

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
  baseURL?: string
  snapshot?: PriceSnapshot
}): EstimatedCost {
  if (isExternalEngine(input.runtimeId)) {
    return reportedOrHidden(input.reportedCostUsd)
  }
  if (isLocalUnbilledKind(input.providerKind)) {
    return { status: "local_unbilled" }
  }
  if (input.usage.usageIncomplete) {
    return { status: "unknown", missing: ["usage"] }
  }
  if (!hasPositiveTokens(input.usage)) {
    return { status: "estimated", usd: 0 }
  }
  const official = isOfficialProviderEndpoint(input.providerKind ?? "", input.baseURL)
  if (!official && !hasUserRates(input.userRates)) {
    return { status: "unknown", missing: ["price"] }
  }
  const matched = matchModelRate({
    providerKind: input.providerKind ?? "",
    modelId: input.modelId ?? "",
    userRates: input.userRates,
    snapshot: official ? input.snapshot : undefined
  })
  if (!matched) return { status: "unknown", missing: ["price"] }
  return billMatched(input.usage, matched.rate, matched)
}

function billMatched(
  usage: TokenUsage,
  rate: ModelRate,
  matched: { source: string; snapshotDate?: string; snapshotVersion?: string }
): EstimatedCost {
  const missing: CostMissingItem[] = []
  let usd = 0
  let billed = false
  const noCache = noCacheTokensOf(usage)
  addLine(noCache, rate.input, "input", missing, (n) => {
    usd += n
    billed = true
  })
  addLine(positiveTokens(usage.cacheReadTokens), rate.cacheRead, "cacheRead", missing, (n) => {
    usd += n
    billed = true
  })
  addLine(positiveTokens(usage.cacheWriteTokens), rate.cacheWrite, "cacheWrite", missing, (n) => {
    usd += n
    billed = true
  })
  const output = positiveTokens(usage.outputTokens) ?? 0
  const reasoning = positiveTokens(usage.reasoningTokens) ?? 0
  if (reasoning > 0 && rate.reasoning !== undefined) {
    const textOut = Math.max(0, output - reasoning)
    addLine(textOut, rate.output, "output", missing, (n) => {
      usd += n
      billed = true
    })
    usd += (reasoning / 1_000_000) * rate.reasoning
    billed = true
  } else {
    addLine(output, rate.output, "output", missing, (n) => {
      usd += n
      billed = true
    })
  }
  if (missing.length > 0) return { status: "unknown", missing, source: matched.source as CostSource }
  if (!billed) return { status: "estimated", usd: 0, source: matched.source as CostSource }
  return {
    status: "estimated",
    usd,
    source: matched.source as CostSource,
    snapshotDate: matched.snapshotDate,
    snapshotVersion: matched.snapshotVersion
  }
}

function addLine(
  tokens: number | undefined,
  price: number | undefined,
  missingKey: CostMissingItem,
  missing: CostMissingItem[],
  add: (usd: number) => void
): void {
  if (tokens === undefined || tokens <= 0) return
  if (price === undefined) {
    missing.push(missingKey)
    return
  }
  add((tokens / 1_000_000) * price)
}

export function noCacheTokensOf(usage: TokenUsage): number | undefined {
  if (typeof usage.noCacheTokens === "number" && Number.isFinite(usage.noCacheTokens)) {
    return Math.max(0, usage.noCacheTokens)
  }
  if (typeof usage.inputTokens !== "number" || !Number.isFinite(usage.inputTokens)) return undefined
  return Math.max(
    0,
    usage.inputTokens - (positiveOrZero(usage.cacheReadTokens) + positiveOrZero(usage.cacheWriteTokens))
  )
}

export function hasPositiveTokens(usage: TokenUsage): boolean {
  return (
    (positiveTokens(usage.inputTokens) ?? 0) > 0 ||
    (positiveTokens(usage.outputTokens) ?? 0) > 0 ||
    (positiveTokens(usage.noCacheTokens) ?? 0) > 0 ||
    (positiveTokens(usage.cacheReadTokens) ?? 0) > 0 ||
    (positiveTokens(usage.cacheWriteTokens) ?? 0) > 0 ||
    (positiveTokens(usage.reasoningTokens) ?? 0) > 0
  )
}

function positiveTokens(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined
}

function positiveOrZero(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0
}

function isExternalEngine(runtimeId: string | undefined): boolean {
  if (!runtimeId || runtimeId === "enjoy-local") return false
  return isAcpHostRuntimeId(runtimeId) || isCustomAgentId(runtimeId) || runtimeId === "sandbox-harness"
}

function reportedOrHidden(reported: number | undefined): EstimatedCost {
  if (typeof reported === "number" && Number.isFinite(reported) && reported >= 0) {
    return { status: "reported", usd: reported, source: "engine" }
  }
  return { status: "not_reported" }
}
