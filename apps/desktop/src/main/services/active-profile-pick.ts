/**
 * leo soft（#135）：开跑（getActiveProfile）与就绪（assembleChatReadiness）共用同一挑法。
 * 先选「已启用且是当前」的档案；当前档案被关了就回落第一个已启用的。两边不再各挑各的。
 */
export function pickActiveProfile<T extends { enabled?: boolean }>(
  rows: readonly T[],
  isActive: (row: T) => boolean
): T | undefined {
  const enabled = rows.filter((row) => row.enabled !== false)
  return enabled.find(isActive) ?? enabled[0]
}
