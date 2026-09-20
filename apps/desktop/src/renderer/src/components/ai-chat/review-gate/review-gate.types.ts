/**
 * M-B 验收闸：会话收工阶段，不是 HMAC 工具审批。
 */
export const REVIEW_GATE_PHASES = ["running", "needs_review", "done"] as const

export type ReviewGatePhase = (typeof REVIEW_GATE_PHASES)[number]

export type ReviewGatePhaseInput = {
  running: boolean
  workflowStatus?: "todo" | "in_progress" | "needs_review" | "done" | null
}
