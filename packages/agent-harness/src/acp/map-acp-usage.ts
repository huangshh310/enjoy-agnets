/**
 * ACP usage_update → usage.updated。used 记入 input/total，size 记入 contextWindow。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

export function mapAcpUsageUpdate(rec: Record<string, unknown>, runId: string): StreamEvent[] {
  const used = positiveInt(rec.used)
  const size = positiveInt(rec.size)
  if (used == null && size == null) return []
  return [
    {
      type: "usage.updated",
      runId,
      ...(used != null ? { inputTokens: used, totalTokens: used } : {}),
      ...(size != null ? { contextWindow: size } : {})
    }
  ]
}

function positiveInt(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}
