/**
 * 审批 HMAC：token 被篡改即失效。密钥只在 main 内存，不进 renderer。
 */
import { createHmac, timingSafeEqual } from "node:crypto"

export function signApproval(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

export function verifyApproval(secret: string, payload: string, hmac: string): boolean {
  const expected = Buffer.from(signApproval(secret, payload), "hex")
  const actual = Buffer.from(hmac, "hex")
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

export function approvalPayload(input: {
  runId: string
  toolCallId: string
  approvalId: string
  name: string
  args: unknown
}): string {
  return JSON.stringify({
    runId: input.runId,
    toolCallId: input.toolCallId,
    approvalId: input.approvalId,
    name: input.name,
    args: input.args
  })
}
