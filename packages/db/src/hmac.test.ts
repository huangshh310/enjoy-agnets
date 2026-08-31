import assert from "node:assert/strict"
import { test } from "node:test"
import { approvalPayload, signApproval, verifyApproval } from "./hmac.ts"

test("审批 HMAC 校验通过", () => {
  const payload = approvalPayload({
    runId: "r1",
    toolCallId: "t1",
    approvalId: "a1",
    name: "write_file",
    args: { path: "a.ts" }
  })
  const hmac = signApproval("secret", payload)
  assert.equal(verifyApproval("secret", payload, hmac), true)
})

test("篡改入参后 HMAC 失效", () => {
  const payload = approvalPayload({
    runId: "r1",
    toolCallId: "t1",
    approvalId: "a1",
    name: "write_file",
    args: { path: "a.ts" }
  })
  const hmac = signApproval("secret", payload)
  const tampered = approvalPayload({
    runId: "r1",
    toolCallId: "t1",
    approvalId: "a1",
    name: "write_file",
    args: { path: "../etc/passwd" }
  })
  assert.equal(verifyApproval("secret", tampered, hmac), false)
})
