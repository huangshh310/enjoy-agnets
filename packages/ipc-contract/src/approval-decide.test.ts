import assert from "node:assert/strict"
import { test } from "node:test"
import {
  APPROVAL_HMAC_FAILED,
  APPROVAL_NOT_REATTACHED,
  extractApprovalDecideCode
} from "./approval-decide.ts"

test("从 IPC 包装句里抽出 decide 码", () => {
  assert.equal(extractApprovalDecideCode(new Error(APPROVAL_NOT_REATTACHED)), APPROVAL_NOT_REATTACHED)
  assert.equal(
    extractApprovalDecideCode(new Error(`Error invoking remote method 'agent.decide': Error: ${APPROVAL_HMAC_FAILED}`)),
    APPROVAL_HMAC_FAILED
  )
  assert.equal(extractApprovalDecideCode(new Error("Approval token was tampered.")), APPROVAL_HMAC_FAILED)
  assert.equal(extractApprovalDecideCode(new Error("Request timed out")), undefined)
})
