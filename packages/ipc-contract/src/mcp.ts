/**
 * MCP Server / 权限 IPC。默认不信任新 Server；工具分级审批。
 */
import { z } from "zod"

export const McpTransport = z.enum(["stdio", "sse", "http"])
export type McpTransport = z.infer<typeof McpTransport>

export const McpServer = z.object({
  id: z.string(),
  name: z.string(),
  transport: McpTransport,
  command: z.string().optional(),
  url: z.string().optional(),
  envRef: z.string().optional(),
  allowedResourceUris: z.array(z.string()).default([]),
  modelVisibleTools: z.array(z.string()).default([]),
  appOnlyTools: z.array(z.string()).default([]),
  trusted: z.boolean().default(false),
  connected: z.boolean().default(false),
  error: z.string().optional(),
  tools: z
    .array(z.object({ name: z.string(), description: z.string().optional() }))
    .optional()
})
export type McpServer = z.infer<typeof McpServer>

export const McpPermissionLevel = z.enum(["deny", "ask", "allow"])
export type McpPermissionLevel = z.infer<typeof McpPermissionLevel>

export const McpPermission = z.object({
  serverId: z.string(),
  scope: z.enum(["server", "tool", "app"]),
  name: z.string(),
  level: McpPermissionLevel
})
export type McpPermission = z.infer<typeof McpPermission>

export const McpUpsertInput = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    transport: McpTransport,
    command: z.string().optional(),
    url: z.string().optional(),
    envRef: z.string().optional(),
    allowedResourceUris: z.array(z.string()).default([]),
    modelVisibleTools: z.array(z.string()).default([]),
    appOnlyTools: z.array(z.string()).default([]),
    trusted: z.boolean().default(false)
  })
  .strict()
export type McpUpsertInput = z.infer<typeof McpUpsertInput>

export const McpIdInput = z.object({ id: z.string().min(1) }).strict()
export type McpIdInput = z.infer<typeof McpIdInput>

export const McpSetPermissionInput = z
  .object({
    serverId: z.string().min(1),
    scope: z.enum(["server", "tool", "app"]),
    name: z.string().min(1),
    level: McpPermissionLevel
  })
  .strict()
export type McpSetPermissionInput = z.infer<typeof McpSetPermissionInput>

export const McpCallInput = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    args: z.unknown().optional()
  })
  .strict()
export type McpCallInput = z.infer<typeof McpCallInput>

export const McpOpenAppInput = z
  .object({
    id: z.string().min(1),
    resourceUri: z.string().optional()
  })
  .strict()
export type McpOpenAppInput = z.infer<typeof McpOpenAppInput>

export const McpAppMessageInput = z
  .object({
    id: z.string().min(1),
    message: z.unknown()
  })
  .strict()
export type McpAppMessageInput = z.infer<typeof McpAppMessageInput>
