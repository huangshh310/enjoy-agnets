/**
 * 审批决定用的 runId：卡片事件上的优先，不要只信 store。
 */
export function resolveApprovalRunId(
  pending: { runId?: string } | null | undefined,
  storeRunId: string | null | undefined
): string | null {
  const fromPending = pending?.runId?.trim()
  if (fromPending) return fromPending
  const fromStore = storeRunId?.trim()
  return fromStore || null
}
