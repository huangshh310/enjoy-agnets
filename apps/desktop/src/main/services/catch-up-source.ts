/**
 * 从 checkpoint / RunAgentInput 认出补跑来源。无 Electron / DB。
 */
export type CatchUpSettleOpts = {
  automationId: string
  scheduledAt?: number
  isCatchUp: true
}

export function catchUpSourceOf(source: unknown): CatchUpSettleOpts | undefined {
  if (!source || typeof source !== "object") return undefined
  const row = source as { automationId?: unknown; scheduledAt?: unknown; isCatchUp?: unknown }
  if (row.isCatchUp !== true || typeof row.automationId !== "string" || !row.automationId) {
    return undefined
  }
  return {
    automationId: row.automationId,
    scheduledAt: typeof row.scheduledAt === "number" ? row.scheduledAt : undefined,
    isCatchUp: true
  }
}
