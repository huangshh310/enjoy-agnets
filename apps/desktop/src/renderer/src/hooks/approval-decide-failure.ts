/**
 * 审批点允许失败：只有回挂卡在 reattach 前才安静等重发。
 */
import {
  APPROVAL_ASK_USER_NO_SESSION,
  APPROVAL_HMAC_FAILED,
  APPROVAL_NO_MATCHING,
  APPROVAL_NOT_REATTACHED,
  APPROVAL_RUN_INACTIVE,
  extractApprovalDecideCode
} from "@enjoy-agents/ipc-contract/approval-decide"

const COPY: Record<Exclude<ReturnType<typeof extractApprovalDecideCode>, undefined>, string> = {
  [APPROVAL_NOT_REATTACHED]: "",
  [APPROVAL_HMAC_FAILED]: "Approval token was tampered.",
  [APPROVAL_ASK_USER_NO_SESSION]: "ask_user_questions cannot be allow_session",
  [APPROVAL_RUN_INACTIVE]: "This agent run is no longer active.",
  [APPROVAL_NO_MATCHING]: "No matching tool approval is waiting."
}

/** 要写横幅的人话；reattach 前点允许回 null，禁止红条。 */
export function approvalDecideUiError(error: unknown): string | null {
  const code = extractApprovalDecideCode(error)
  if (code === APPROVAL_NOT_REATTACHED) return null
  if (code) return COPY[code]
  if (error instanceof Error && error.message.trim()) return error.message
  const text = String(error ?? "").trim()
  return text || "Approval failed."
}
