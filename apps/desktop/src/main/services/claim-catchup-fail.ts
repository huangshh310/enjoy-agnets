/**
 * 同一条 ActiveRun 实例只收尾一次。按实例不按 runId，续跑新实例可再失败。
 */
const claimed = new WeakSet<object>()

export function claimCatchUpFail(run: object): boolean {
  if (claimed.has(run)) return false
  claimed.add(run)
  return true
}
