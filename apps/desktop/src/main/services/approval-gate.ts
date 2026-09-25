/**
 * 子 Agent 写盘等待主循环同一条 decideApproval，不另开审批通道。
 */
export type ApprovalUserDecision = "allow" | "deny" | "allow_session" | "allow_always"

/** 子循环不认 allow_always：簿已由父路径 applyApprovalDecision 写过，这里只当一次 allow。 */
export function toSubagentUserDecision(
  decision: ApprovalUserDecision
): "allow" | "deny" | "allow_session" {
  return decision === "allow_always" ? "allow" : decision
}

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
