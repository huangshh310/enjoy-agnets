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

const KEYS: Record<Exclude<ReturnType<typeof extractApprovalDecideCode>, undefined>, string | null> = {
  [APPROVAL_NOT_REATTACHED]: null,
  [APPROVAL_HMAC_FAILED]: "chat.approvalDecideHmac",
  [APPROVAL_ASK_USER_NO_SESSION]: "chat.approvalDecideAskUserNoSession",
  [APPROVAL_RUN_INACTIVE]: "chat.approvalDecideRunInactive",
  [APPROVAL_NO_MATCHING]: "chat.approvalDecideNoMatching"
}

/** 要写横幅的 i18n 键；reattach 前点允许回 null，禁止红条。 */
export function approvalDecideUiError(error: unknown): string | null {
  const code = extractApprovalDecideCode(error)
  if (code === APPROVAL_NOT_REATTACHED) return null
  if (code) return KEYS[code]
  return "chat.approvalDecideFailed"
}
