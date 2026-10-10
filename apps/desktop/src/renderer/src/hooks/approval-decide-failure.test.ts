import assert from "node:assert/strict"
import { test } from "node:test"
import {
  APPROVAL_HMAC_FAILED,
  APPROVAL_NOT_REATTACHED,
  APPROVAL_RUN_INACTIVE
} from "@enjoy-agents/ipc-contract/approval-decide"
import { approvalDecideUiError } from "./approval-decide-failure.ts"

test("只有 reattach 前点允许才安静，其余写出人话", () => {
  assert.equal(approvalDecideUiError(new Error(APPROVAL_NOT_REATTACHED)), null)
  assert.equal(
    approvalDecideUiError(new Error(`Error invoking remote method 'agent.decide': Error: ${APPROVAL_NOT_REATTACHED}`)),
    null
  )
  assert.equal(approvalDecideUiError(new Error("Approval token was tampered.")), "Approval token was tampered.")
  assert.equal(approvalDecideUiError(new Error(APPROVAL_HMAC_FAILED)), "Approval token was tampered.")
  assert.equal(
    approvalDecideUiError(new Error("ask_user_questions cannot be allow_session")),
    "ask_user_questions cannot be allow_session"
  )
  assert.equal(
    approvalDecideUiError(new Error("This agent run is no longer active.")),
    "This agent run is no longer active."
  )
  assert.equal(approvalDecideUiError(new Error(APPROVAL_RUN_INACTIVE)), "This agent run is no longer active.")
  assert.equal(
    approvalDecideUiError(new Error("No matching tool approval is waiting.")),
    "No matching tool approval is waiting."
  )
})
