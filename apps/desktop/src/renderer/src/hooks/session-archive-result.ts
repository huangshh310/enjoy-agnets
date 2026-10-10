/**
 * session.archive 返回值：kai 主进程会先 deny 未决审批再归档，
 * 并带可选 deniedApprovals。渲染层容忍有无该字段，不改 IPC 合约。
 * 双重 deny 安全：主进程已处理后这里读到 0。
 */
export type SessionArchiveResult = {
  deniedApprovals?: number
}

export function readDeniedApprovals(result: unknown): number {
  if (!result || typeof result !== "object") return 0
  const value = (result as SessionArchiveResult).deniedApprovals
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}
