/**
 * Inbox 拍板真源：main 列出 decision IS NULL 且会话未归档的审批行。
 */
import { z } from "zod"

export const ApprovalsPendingInput = z.object({}).strict()
export type ApprovalsPendingInput = z.infer<typeof ApprovalsPendingInput>

export const PendingApprovalItem = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  sessionId: z.string().min(1),
  workspaceId: z.string().nullable(),
  sessionTitle: z.string(),
  name: z.string().min(1),
  toolCallId: z.string().min(1),
  createdAt: z.number().int()
})
export type PendingApprovalItem = z.infer<typeof PendingApprovalItem>

export const ApprovalsPendingResult = z.object({
  items: z.array(PendingApprovalItem)
})
export type ApprovalsPendingResult = z.infer<typeof ApprovalsPendingResult>
