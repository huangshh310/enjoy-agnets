/**
 * 会话级估算合计。读 runs.usage_json + 当前 vault 用户单价，再走生产计价。
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
import { readVault } from "./secrets-vault"

export async function loadSessionEstimatedCost(raw: unknown): Promise<SessionEstimatedCostType> {
  const { sessionId } = SessionEstimatedCostInput.parse(raw)
  const vault = await readVault()
  const runs = listRuns(getDatabase(), { sessionId }).map((row) => {
    const usage = parseRunUsage(row.usageJson)
    const modelId = usage?.modelId ?? row.modelId ?? undefined
    const profile =
      vault.profiles.find((item) => item.id === row.providerId) ??
      vault.profiles.find((item) => item.kind === (usage?.providerKind ?? ""))
    const model = profile?.models?.find((item) => item.id === modelId)
    return {
      runId: row.id,
      usage,
      runtimeId: usage?.runtimeId,
      providerKind: usage?.providerKind ?? profile?.kind,
      modelId,
      userRates: userRatesFrom(model)
    }
  })
  return SessionEstimatedCost.parse(buildSessionEstimatedCost({ sessionId, runs }))
}
