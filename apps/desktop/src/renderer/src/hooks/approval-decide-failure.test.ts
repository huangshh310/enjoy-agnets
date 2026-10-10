import assert from "node:assert/strict"
import { test } from "node:test"
import {
  APPROVAL_HMAC_FAILED,
  APPROVAL_NO_MATCHING,
  APPROVAL_NOT_REATTACHED,
  APPROVAL_RUN_INACTIVE
} from "@enjoy-agents/ipc-contract/approval-decide"
import { approvalDecideUiError } from "./approval-decide-failure.ts"

test("reattach 前点允许安静，其它失败走人话键", () => {
  assert.equal(approvalDecideUiError(new Error(APPROVAL_NOT_REATTACHED)), null)
  assert.equal(
    approvalDecideUiError(new Error(`Error invoking remote method 'agent.decide': Error: ${APPROVAL_NOT_REATTACHED}`)),
    null
  )
  assert.equal(approvalDecideUiError(new Error("Approval token was tampered.")), "chat.approvalDecideHmac")
  assert.equal(approvalDecideUiError(new Error(APPROVAL_HMAC_FAILED)), "chat.approvalDecideHmac")
  assert.equal(
    approvalDecideUiError(new Error("ask_user_questions cannot be allow_session")),
    "chat.approvalDecideAskUserNoSession"
  )
  assert.equal(
    approvalDecideUiError(new Error("This agent run is no longer active.")),
    "chat.approvalDecideRunInactive"
  )
  assert.equal(approvalDecideUiError(new Error(APPROVAL_RUN_INACTIVE)), "chat.approvalDecideRunInactive")
  assert.equal(
    approvalDecideUiError(new Error("No matching tool approval is waiting.")),
    "chat.approvalDecideNoMatching"
  )
  assert.equal(approvalDecideUiError(new Error("boom")), "chat.approvalDecideFailed")
})
