/**
 * 会话级估算合计。只读已结束的 agent run；找不到档案不要退回同 kind 的第一个档案。
 */
import { listRuns } from "@enjoy-agents/db"
import {
  SessionEstimatedCost,
  SessionEstimatedCostInput,
  type SessionEstimatedCost as SessionEstimatedCostType
} from "@enjoy-agents/ipc-contract/estimated-cost"
import { buildSessionEstimatedCost, userRatesFrom } from "@enjoy-agents/providers/pricing"
import { getDatabase } from "./database"
import { parseRunUsage } from "./run-usage"
import { parseAgentCheckpointExtras } from "./running-orphan-plan"
import { readVault } from "./secrets-vault"

export async function loadSessionEstimatedCost(raw: unknown): Promise<SessionEstimatedCostType> {
  const { sessionId } = SessionEstimatedCostInput.parse(raw)
  const vault = await readVault()
  const runs = listRuns(getDatabase(), { sessionId, kind: "agent" }).map((row) => {
    const usage = parseRunUsage(row.usageJson)
    const modelId = usage?.modelId ?? row.modelId ?? undefined
    const profile = vault.profiles.find((item) => item.id === row.providerId)
    const model = profile?.models?.find((item) => item.id === modelId)
    const extras = parseAgentCheckpointExtras(row.checkpoint)
    return {
      runId: row.id,
      kind: row.kind,
      status: row.status,
      usage,
      runtimeId: usage?.runtimeId ?? extras.runtimeId ?? runtimeFromModelId(modelId),
      providerKind: usage?.providerKind ?? profile?.kind,
      modelId,
      userRates: usage?.userRates ?? userRatesFrom(model),
      baseURL: usage?.baseURL ?? profile?.baseURL
    }
  })
  return SessionEstimatedCost.parse(buildSessionEstimatedCost({ sessionId, runs }))
}

function runtimeFromModelId(modelId: string | undefined): string | undefined {
  if (!modelId) return undefined
  return modelId.startsWith("cli:") ? modelId.slice(4) : undefined
}
