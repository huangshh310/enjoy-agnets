/**
 * 回给 SDK 的 tool-approval-response。回放 / 决策共用，必须带原 approvalId。
 */
import type { ModelMessage } from "ai"

export function approvalResponseMessage(input: {
  approvalId: string
  approved: boolean
  reason?: string
}): ModelMessage {
  return {
    role: "tool",
    content: [
      {
        type: "tool-approval-response",
        approvalId: input.approvalId,
        approved: input.approved,
        reason: input.reason
      }
    ]
  } as ModelMessage
}
