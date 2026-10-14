/**
 * Inbox 待验收真源：main 列出 workflow_status = needs_review 且未归档的会话。
 */
import { z } from "zod"
import { ReviewChangedFiles } from "./credential-check.ts"

export const SessionsNeedsReviewInput = z.object({}).strict()
export type SessionsNeedsReviewInput = z.infer<typeof SessionsNeedsReviewInput>

export const SessionNeedsReviewItem = z.object({
  id: z.string().min(1),
  workspaceId: z.string().nullable(),
  title: z.string(),
  updatedAt: z.number().int(),
  workflowStatus: z.literal("needs_review"),
  changedFiles: ReviewChangedFiles.optional(),
  completedAt: z.string().optional()
})
export type SessionNeedsReviewItem = z.infer<typeof SessionNeedsReviewItem>

export const SessionsNeedsReviewResult = z.object({
  items: z.array(SessionNeedsReviewItem)
})
export type SessionsNeedsReviewResult = z.infer<typeof SessionsNeedsReviewResult>
