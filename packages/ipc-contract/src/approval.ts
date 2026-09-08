/**
 * 审批决定：未知字段（含多余 args）即拒。
 * ask_user_questions 的答案走 answers，不走 args。
 */
import { z } from "zod"
import { AskUserAnswersSchema } from "./ask-user-questions.ts"

export const ApprovalDecision = z
  .object({
    runId: z.string(),
    toolCallId: z.string(),
    approvalId: z.string(),
    decision: z.enum(["allow", "deny", "allow_session"]),
    reason: z.string().optional(),
    answers: AskUserAnswersSchema.optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.decision === "allow_session" && value.answers) {
      ctx.addIssue({
        code: "custom",
        message: "ask_user_questions cannot use allow_session"
      })
    }
  })
export type ApprovalDecision = z.infer<typeof ApprovalDecision>
