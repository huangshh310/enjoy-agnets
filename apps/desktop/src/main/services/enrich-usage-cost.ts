/**
 * 给 usage.updated 挂上估算。计价走 providers 生产函数。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { estimateRunCost, userRatesFrom, type UserModelRates } from "@enjoy-agents/providers/pricing"

export type UsageBillingContext = {
  runtimeId?: string
  providerKind?: string
  modelId?: string
  userRates?: UserModelRates
  baseURL?: string
  usageIncomplete?: boolean
  maxStepInputTokens?: number
}

export function enrichUsageEvent(
  event: Extract<StreamEvent, { type: "usage.updated" }>,
  context: UsageBillingContext
): Extract<StreamEvent, { type: "usage.updated" }> {
  const estimatedCost = estimateRunCost({
    usage: {
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      noCacheTokens: event.noCacheTokens,
      cacheReadTokens: event.cacheReadTokens,
      cacheWriteTokens: event.cacheWriteTokens,
      reasoningTokens: event.reasoningTokens,
      usageIncomplete: context.usageIncomplete,
      maxStepInputTokens: context.maxStepInputTokens
    },
    runtimeId: context.runtimeId,
    providerKind: context.providerKind,
    modelId: context.modelId,
    userRates: context.userRates,
    reportedCostUsd: event.reportedCostUsd,
    baseURL: context.baseURL
  })
  return { ...event, estimatedCost }
}

export function billingContextOf(run: {
  input: { runtimeId?: string; modelId?: string }
  secret?: { provider?: string; modelId?: string; models?: unknown[]; baseURL?: string }
  usageIncomplete?: boolean
  maxStepInputTokens?: number
}): UsageBillingContext {
  const modelId = run.input.modelId ?? run.secret?.modelId
  return {
    runtimeId: run.input.runtimeId,
    providerKind: run.secret?.provider,
    modelId,
    userRates: userRatesForModel(run.secret?.models, modelId),
    baseURL: run.secret?.baseURL,
    usageIncomplete: run.usageIncomplete,
    maxStepInputTokens: run.maxStepInputTokens
  }
}

export function userRatesForModel(
  models: unknown[] | undefined,
  modelId: string | undefined
): UserModelRates | undefined {
  if (!modelId || !models) return undefined
  const model = models.find((item) => {
    return Boolean(item && typeof item === "object" && "id" in item && (item as { id?: string }).id === modelId)
  })
  return userRatesFrom(model)
}
