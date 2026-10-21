/**
 * 用户点了停止（或归档）的 run：abortActiveRunMemory 已结清未决、把库写成 cancelled、移出内存。
 * 之后流里迟到的审批 / 泵晚到的停车与工具边界，都不得再弹卡或把库改回 waiting_review / running。
 */
export function runWasStopped(run: { userCancelled?: boolean }): boolean {
  return run.userCancelled === true
}
