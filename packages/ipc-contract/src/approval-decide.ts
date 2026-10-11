/**
 * agent.decide 失败码。只有回挂卡在 reattach 前点允许才安静等重发。
 */
export const APPROVAL_NOT_REATTACHED = "approval_not_reattached"
export const APPROVAL_HMAC_FAILED = "approval_hmac_failed"
export const APPROVAL_ASK_USER_NO_SESSION = "approval_ask_user_no_session"
export const APPROVAL_RUN_INACTIVE = "approval_run_inactive"
export const APPROVAL_NO_MATCHING = "approval_no_matching"

export const APPROVAL_DECIDE_CODES = [
  APPROVAL_NOT_REATTACHED,
  APPROVAL_HMAC_FAILED,
  APPROVAL_ASK_USER_NO_SESSION,
  APPROVAL_RUN_INACTIVE,
  APPROVAL_NO_MATCHING
] as const

export type ApprovalDecideCode = (typeof APPROVAL_DECIDE_CODES)[number]

export function isApprovalDecideCode(value: string | undefined | null): value is ApprovalDecideCode {
  return (
    value === APPROVAL_NOT_REATTACHED ||
    value === APPROVAL_HMAC_FAILED ||
    value === APPROVAL_ASK_USER_NO_SESSION ||
    value === APPROVAL_RUN_INACTIVE ||
    value === APPROVAL_NO_MATCHING
  )
}

export function extractApprovalDecideCode(error: unknown): ApprovalDecideCode | undefined {
  const text = errorText(error)
  for (const code of APPROVAL_DECIDE_CODES) {
    if (text === code || text.endsWith(`: ${code}`) || text.endsWith(`Error: ${code}`)) return code
  }
  if (text.includes("ask_user_questions cannot be allow_session")) return APPROVAL_ASK_USER_NO_SESSION
  if (text.includes("Approval token was tampered")) return APPROVAL_HMAC_FAILED
  if (text.includes("This agent run is no longer active")) return APPROVAL_RUN_INACTIVE
  if (text.includes("No matching tool approval is waiting")) return APPROVAL_NO_MATCHING
  return undefined
}

function errorText(error: unknown): string {
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  return String(error ?? "")
}
