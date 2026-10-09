/**
 * 消费审批：已决 id 回放或 fail closed，不开新卡、不换 id。
 */
import type { RememberApprovalPlan } from "@enjoy-agents/db"

export const APPROVAL_ARGS_MISMATCH = "APPROVAL_ARGS_MISMATCH"
export const APPROVAL_ARGS_MISMATCH_COPY = "审批参数已变化，本次未执行。"

export type ApprovalDecisionName = "allow" | "deny" | "allow_session" | "allow_always"

export type ConsumedApproval =
  | {
      kind: "open_card"
      pending: { approvalId: string; toolCallId: string; name: string; args?: unknown }
    }
  | {
      kind: "replay"
      approvalId: string
      approved: boolean
      decision: ApprovalDecisionName
    }
  | {
      kind: "fail_closed"
      approvalId: string
      approved: false
      code: typeof APPROVAL_ARGS_MISMATCH
      message: typeof APPROVAL_ARGS_MISMATCH_COPY
    }

export function asApprovalDecision(value: string | undefined): ApprovalDecisionName {
  if (value === "allow" || value === "allow_session" || value === "allow_always") return value
  return "deny"
}

export function applyRememberedApproval(
  plan: RememberApprovalPlan,
  pending: { toolCallId: string; name: string; args?: unknown }
): ConsumedApproval {
  if (plan.action === "insert" || plan.action === "reuse") {
    return {
      kind: "open_card",
      pending: {
        approvalId: plan.id,
        toolCallId: pending.toolCallId,
        name: pending.name,
        args: pending.args
      }
    }
  }
  if (plan.action === "fail_closed") {
    return {
      kind: "fail_closed",
      approvalId: plan.id,
      approved: false,
      code: APPROVAL_ARGS_MISMATCH,
      message: APPROVAL_ARGS_MISMATCH_COPY
    }
  }
  const decision = asApprovalDecision(plan.decision)
  return {
    kind: "replay",
    approvalId: plan.id,
    approved: decision !== "deny",
    decision
  }
}
