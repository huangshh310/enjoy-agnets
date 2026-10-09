/**
 * ACP usage_update → usage.updated。used 记入 input/total，size 记入 contextWindow。
 * 引擎自己上报的花费原样带上；没上报不编造。只认非负 USD，累计值由上层取最新一次。
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
  if (!isUsdCurrency(rec)) return undefined
  const direct = finiteMoney(rec.costUsd ?? rec.cost_usd ?? rec.cost)
  if (direct !== undefined) return direct >= 0 ? direct : undefined
  const nested = rec.cost
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const bag = nested as { usd?: unknown; amount?: unknown; currency?: unknown }
    if (!isUsdCurrency(bag)) return undefined
    const amount = finiteMoney(bag.usd ?? bag.amount)
    return amount !== undefined && amount >= 0 ? amount : undefined
  }
  return undefined
}

function isUsdCurrency(rec: { currency?: unknown }): boolean {
  const raw = rec.currency
  if (raw == null || raw === "") return true
  return String(raw).trim().toUpperCase() === "USD"
}

function finiteMoney(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function positiveInt(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}
