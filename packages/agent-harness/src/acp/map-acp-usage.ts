/**
 * ACP usage_update → usage.updated。used 记入 input/total，size 记入 contextWindow。
 * 引擎自己上报的花费原样带上；没上报不编造。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

export function mapAcpUsageUpdate(rec: Record<string, unknown>, runId: string): StreamEvent[] {
  const used = positiveInt(rec.used)
  const size = positiveInt(rec.size)
  const reported = reportedCostUsd(rec)
  if (used == null && size == null && reported == null) return []
  return [
    {
      type: "usage.updated",
      runId,
      ...(used != null ? { inputTokens: used, totalTokens: used } : {}),
      ...(size != null ? { contextWindow: size } : {}),
      ...(reported != null ? { reportedCostUsd: reported } : {})
    }
  ]
}

function reportedCostUsd(rec: Record<string, unknown>): number | undefined {
  const direct = finiteMoney(rec.costUsd ?? rec.cost_usd ?? rec.cost)
  if (direct !== undefined) return direct
  const nested = rec.cost
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return finiteMoney((nested as { usd?: unknown; amount?: unknown }).usd ?? (nested as { amount?: unknown }).amount)
  }
  return undefined
}

function finiteMoney(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : undefined
}

function positiveInt(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}
