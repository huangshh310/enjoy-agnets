/**
 * 子 Agent 写盘等待主循环同一条 decideApproval，不另开审批通道。
 */
export type ApprovalUserDecision = "allow" | "deny" | "allow_session" | "allow_always"

export type ApprovalGate = {
  wait: (approvalId: string) => Promise<ApprovalUserDecision>
  resolve: (approvalId: string, decision: ApprovalUserDecision) => boolean
}

export function createApprovalGate(): ApprovalGate {
  const waiters = new Map<string, (decision: ApprovalUserDecision) => void>()
  return {
    wait(approvalId) {
      return new Promise((resolve) => {
        waiters.set(approvalId, resolve)
      })
    },
    resolve(approvalId, decision) {
      const waiter = waiters.get(approvalId)
      waiters.delete(approvalId)
      waiter?.(decision)
      return Boolean(waiter)
    }
  }
}
