/**
 * 会话 IPC：改名走 Zod，未知字段即拒。
 */
import { z } from "zod"

export const SessionRenameInput = z
  .object({
    sessionId: z.string().min(1),
    title: z.string().min(1).max(80)
  })
  .strict()
export type SessionRenameInput = z.infer<typeof SessionRenameInput>

export const SessionWorkflowStatus = z.enum(["todo", "in_progress", "needs_review", "done"])
export type SessionWorkflowStatus = z.infer<typeof SessionWorkflowStatus>

export const SessionPatchInput = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(200).optional(),
    flagged: z.boolean().optional(),
    workflowStatus: SessionWorkflowStatus.nullable().optional(),
    goal: z.string().max(2000).nullable().optional(),
    recap: z.string().max(10000).nullable().optional()
  })
  .strict()
  .refine(
    (v) =>
      v.title !== undefined ||
      v.flagged !== undefined ||
      v.workflowStatus !== undefined ||
      v.goal !== undefined ||
      v.recap !== undefined,
    { message: "At least one patch field must be provided" }
  )
export type SessionPatchInput = z.infer<typeof SessionPatchInput>

export const SessionSummary = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  createdAt: z.number().optional(),
  flagged: z.boolean().optional(),
  workflowStatus: SessionWorkflowStatus.nullable().optional(),
  goal: z.string().nullable().optional(),
  recap: z.string().nullable().optional(),
  relativeTime: z.string().optional()
})
export type SessionSummary = z.infer<typeof SessionSummary>

export const SessionIdInput = z
  .object({
    sessionId: z.string().min(1)
  })
  .strict()
export type SessionIdInput = z.infer<typeof SessionIdInput>

/** 渲染层上报当前聚焦会话。null = 没有前台会话。 */
export const SessionSetFocusedInput = z
  .object({
    sessionId: z.string().min(1).nullable()
  })
  .strict()
export type SessionSetFocusedInput = z.infer<typeof SessionSetFocusedInput>

/** 归档前结清未决审批为 cancelled；deniedApprovals 是结清条数，缺省=旧客户端。 */
export const SessionArchiveResult = z.object({
  id: z.string(),
  archivedAt: z.number().int(),
  deniedApprovals: z.number().int().nonnegative().optional()
})
export type SessionArchiveResult = z.infer<typeof SessionArchiveResult>

/** 删掉该条及之后的消息，把 Prompt 退回 Composer。 */
export const SessionTruncateFromInput = z
  .object({
    sessionId: z.string().min(1),
    messageId: z.string().min(1)
  })
  .strict()
export type SessionTruncateFromInput = z.infer<typeof SessionTruncateFromInput>

export const SessionForkInput = z
  .object({
    sessionId: z.string().min(1),
    messageId: z.string().min(1)
  })
  .strict()
export type SessionForkInput = z.infer<typeof SessionForkInput>

export const SessionForkResult = SessionSummary.extend({
  runtimeId: z.string().min(1),
  modelId: z.string().optional()
})
export type SessionForkResult = z.infer<typeof SessionForkResult>

export const SessionCreateInput = z
  .object({
    workspaceId: z.string().min(1),
    title: z.string().min(1).max(80).optional()
  })
  .strict()
export type SessionCreateInput = z.infer<typeof SessionCreateInput>

export const ArchivedSession = z.object({
  id: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  archivedAt: z.number()
})
export type ArchivedSession = z.infer<typeof ArchivedSession>

export const SessionRecapInput = z
  .object({
    sessionId: z.string().min(1)
  })
  .strict()
export type SessionRecapInput = z.infer<typeof SessionRecapInput>

export const SessionRecapResult = z.object({
  recap: z.string(),
  heuristic: z.boolean().optional()
})
export type SessionRecapResult = z.infer<typeof SessionRecapResult>
