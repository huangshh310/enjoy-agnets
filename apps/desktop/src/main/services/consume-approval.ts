/**
 * 消费审批：已决 id 回放当时发给 SDK 的 response，或 fail closed。
 * 卡片 / pending 用内部 id；回给 SDK 永远带 sdkApprovalId。
 */
import type { RememberApprovalPlan } from "@enjoy-agents/db"
import {
  APPROVAL_ARGS_MISMATCH,
  APPROVAL_ARGS_MISMATCH_COPY,
  APPROVAL_REPLAY_DENIED,
  APPROVAL_REPLAY_DENIED_COPY
} from "@enjoy-agents/ipc-contract/approval-not-executed"

export {
  APPROVAL_ARGS_MISMATCH,
  APPROVAL_ARGS_MISMATCH_COPY,
  APPROVAL_REPLAY_DENIED,
  APPROVAL_REPLAY_DENIED_COPY
}

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
      reason?: string
    }
  | {
      kind: "fail_closed"
      approvalId: string
      approved: false
      code: typeof APPROVAL_ARGS_MISMATCH | typeof APPROVAL_REPLAY_DENIED
      message: typeof APPROVAL_ARGS_MISMATCH_COPY | typeof APPROVAL_REPLAY_DENIED_COPY
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
    const argsMismatch = plan.cause === "args_mismatch"
    return {
      kind: "fail_closed",
      approvalId: plan.sdkApprovalId,
      approved: false,
      code: argsMismatch ? APPROVAL_ARGS_MISMATCH : APPROVAL_REPLAY_DENIED,
      message: argsMismatch ? APPROVAL_ARGS_MISMATCH_COPY : APPROVAL_REPLAY_DENIED_COPY
    }
  }
  return {
    kind: "replay",
    approvalId: plan.sdkApprovalId,
    approved: plan.approved,
    decision: asApprovalDecision(plan.decision),
    reason: plan.reason
  }
}
