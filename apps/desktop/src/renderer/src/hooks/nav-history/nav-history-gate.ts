/**
 * 历史跳转进行中时，用户自己的打开要作废进行中的恢复。
 * 这个模块不引用会话或路由，避免和 lifecycle 循环依赖。
 */
let token = 0
let suppress = 0

export function beginHistoryApply(): number {
  token += 1
  suppress += 1
  return token
}

export function endHistoryApply(): number {
  suppress = Math.max(0, suppress - 1)
  return suppress
}

export function isApplyCurrent(my: number): boolean {
  return my === token
}

export function isHistorySuppressed(): boolean {
  return suppress > 0
}

/** 用户点击会话或新建对话。历史恢复自己会传 stale，不走这里。 */
export function noteExternalNavigation(): void {
  if (suppress === 0) return
  token += 1
}
