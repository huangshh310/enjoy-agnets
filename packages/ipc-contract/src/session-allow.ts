/**
 * 本会话允许范围：mike 可撤销芯片与 list/revoke IPC 共用。
 * MCP 用工具全名（`mcp_server__leaf`），不是叶子名。
 */
import { z } from "zod"

export const SessionAllowScope = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tool"),
    toolName: z.string().min(1)
  }),
  z.object({
    kind: z.literal("bash_prefix"),
    prefix: z.string().min(1)
  })
])
export type SessionAllowScope = z.infer<typeof SessionAllowScope>

export const SessionAllowItem = z.object({
  runtimeId: z.string().min(1),
  scope: SessionAllowScope
})
export type SessionAllowItem = z.infer<typeof SessionAllowItem>

export const ListSessionAllowsInput = z
  .object({
    sessionId: z.string().min(1)
  })
  .strict()
export type ListSessionAllowsInput = z.infer<typeof ListSessionAllowsInput>

export const ListSessionAllowsResult = z.object({
  items: z.array(SessionAllowItem)
})
export type ListSessionAllowsResult = z.infer<typeof ListSessionAllowsResult>

export const RevokeSessionAllowInput = z
  .object({
    sessionId: z.string().min(1),
    scope: SessionAllowScope,
    runtimeId: z.string().min(1).optional()
  })
  .strict()
export type RevokeSessionAllowInput = z.infer<typeof RevokeSessionAllowInput>

export const RevokeSessionAllowResult = z.object({
  ok: z.literal(true),
  items: z.array(SessionAllowItem)
})
export type RevokeSessionAllowResult = z.infer<typeof RevokeSessionAllowResult>
