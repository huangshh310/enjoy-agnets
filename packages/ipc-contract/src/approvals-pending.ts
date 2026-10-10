/**
 * Inbox 拍板真源：main 列出 decision IS NULL 且会话未归档的审批行。
 * args 是库里签 HMAC 的那份拷贝（已剔 park 字段）；缺参不要猜。
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
  createdAt: z.number().int(),
  /** HMAC 库拷贝；缺省表示对不上，禁止用 {} 弹允许卡。 */
  args: z.unknown().optional()
})
export type PendingApprovalItem = z.infer<typeof PendingApprovalItem>

export const ApprovalsPendingResult = z.object({
  items: z.array(PendingApprovalItem),
  /** waiting_review 回挂扫完才为 true；未完成时 renderer 不得补可决策卡。 */
  restoreSettled: z.boolean().optional()
})
export type ApprovalsPendingResult = z.infer<typeof ApprovalsPendingResult>
