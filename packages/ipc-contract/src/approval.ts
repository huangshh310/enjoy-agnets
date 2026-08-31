/**
 * 审批决定：未知字段（含多余 args）即拒。
 */
import { z } from "zod"

export const ApprovalDecision = z
  .object({
    runId: z.string(),
    toolCallId: z.string(),
    approvalId: z.string(),
    decision: z.enum(["allow", "deny", "allow_session"]),
    reason: z.string().optional()
  })
  .strict()
export type ApprovalDecision = z.infer<typeof ApprovalDecision>
