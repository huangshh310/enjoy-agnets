/**
 * 「本轮」口径：有本轮写盘 path 用它；没有时用会话口径（main session.changes，可信时）；都没有 = 空。
 * sessionPaths=null（会话口径不可信）时保持旧逻辑：空则回落整仓「未提交」。
 */
export function reviewTurnPaths(turnPaths: string[], sessionPaths: string[] | null): string[] {
  if (turnPaths.length > 0) return turnPaths
  return sessionPaths ?? []
}
