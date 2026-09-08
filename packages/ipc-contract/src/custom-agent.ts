/**
 * 用户添加的 stdio ACP agent：id 形如 custom:<slug>，能力保守。
 */
import { z } from "zod"

export const CUSTOM_AGENT_ID_RE = /^custom:[a-z][a-z0-9-]{0,47}$/

export const CustomAgentToolId = z.string().regex(CUSTOM_AGENT_ID_RE)
export type CustomAgentToolId = z.infer<typeof CustomAgentToolId>

export const CustomAgentCwdMode = z.enum(["workspace", "custom"])
export type CustomAgentCwdMode = z.infer<typeof CustomAgentCwdMode>

export const CustomAgentEnv = z
  .record(z.string().min(1).max(80), z.string().max(4096))
  .refine((env) => Object.keys(env).length <= 32, { message: "Too many env vars." })

export const UpsertCustomAgentInput = z
  .object({
    id: CustomAgentToolId.optional(),
    label: z.string().trim().min(1).max(40),
    command: z.string().trim().min(1).max(1024),
    args: z.array(z.string().max(200)).max(32).default([]),
    env: CustomAgentEnv.optional(),
    cwdMode: CustomAgentCwdMode.default("workspace"),
    cwd: z.string().max(1024).optional(),
    enabled: z.boolean().optional(),
    modelId: z.string().max(120).optional()
  })
  .strict()
export type UpsertCustomAgentInput = z.infer<typeof UpsertCustomAgentInput>

export const RemoveCustomAgentInput = z
  .object({
    id: CustomAgentToolId
  })
  .strict()
export type RemoveCustomAgentInput = z.infer<typeof RemoveCustomAgentInput>

export const CustomAgentRecord = z.object({
  id: CustomAgentToolId,
  label: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()).default({}),
  cwdMode: CustomAgentCwdMode,
  cwd: z.string().optional(),
  enabled: z.boolean().default(true),
  modelId: z.string().optional()
})
export type CustomAgentRecord = z.infer<typeof CustomAgentRecord>

export function isCustomAgentId(id: string | undefined): id is CustomAgentToolId {
  return Boolean(id && CUSTOM_AGENT_ID_RE.test(id))
}
