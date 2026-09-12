/**
 * Inbox 档案持久化合约：已读 / 隐藏状态与 error/complete 条目归档。
 * Attention 实况仍在 renderer 内存；这里只管跨重启的耐久层。
 */
import { z } from "zod"

/** 归档条目宽松校验：只锁核心字段（仓库里存的是 renderer AttentionItem 的 JSON）。 */
export const InboxArchivedItem = z
  .object({
    id: z.string().min(1),
    sessionId: z.string().min(1),
    kind: z.enum(["pending_approval", "ask_user", "error", "complete"]),
    occurredAt: z.number().int().optional(),
    summary: z.string().optional(),
    sessionTitle: z.string().optional(),
    workspaceId: z.string().optional(),
    errorMessage: z.string().optional()
  })
  .passthrough()
export type InboxArchivedItem = z.infer<typeof InboxArchivedItem>

export const InboxStateListInput = z.object({}).strict()
export type InboxStateListInput = z.infer<typeof InboxStateListInput>

export const InboxStateRow = z.object({
  id: z.string().min(1),
  readAt: z.number().int().nullable(),
  hiddenAt: z.number().int().nullable(),
  item: InboxArchivedItem.nullable()
})
export type InboxStateRow = z.infer<typeof InboxStateRow>

export const InboxStateListResult = z.object({
  entries: z.array(InboxStateRow)
})
export type InboxStateListResult = z.infer<typeof InboxStateListResult>

export const InboxStatePutInput = z
  .object({
    entries: z
      .array(
        z.object({
          id: z.string().min(1),
          read: z.boolean().optional(),
          hidden: z.boolean().optional(),
          item: InboxArchivedItem.optional()
        })
      )
      .min(1)
  })
  .strict()
export type InboxStatePutInput = z.infer<typeof InboxStatePutInput>
