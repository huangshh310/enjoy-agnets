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

export const SessionSummary = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  relativeTime: z.string().optional()
})
export type SessionSummary = z.infer<typeof SessionSummary>
