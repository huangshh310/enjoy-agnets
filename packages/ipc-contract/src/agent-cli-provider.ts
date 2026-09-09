/**
 * CLI 公开模型 / 供应商条目。不含 token，供 list / inspect / Picker 共用。
 */
import { z } from "zod"

export const AgentCliModel = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(80)
})
export type AgentCliModel = z.infer<typeof AgentCliModel>

/** catalog = auth-broker 可 /login；custom = models.yml / 扩展，不走 auth-broker。 */
export const AgentCliProviderOrigin = z.enum(["catalog", "custom"])
export type AgentCliProviderOrigin = z.infer<typeof AgentCliProviderOrigin>

export const AgentCliLoginKind = z.enum(["oauth", "device", "api_key", "local"])
export type AgentCliLoginKind = z.infer<typeof AgentCliLoginKind>

export const AgentCliProvider = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  loggedIn: z.boolean(),
  origin: AgentCliProviderOrigin.optional(),
  loginKind: AgentCliLoginKind.optional()
})
export type AgentCliProvider = z.infer<typeof AgentCliProvider>

export const AgentToolLoginProvider = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z][a-zA-Z0-9._:-]{0,62}$/)
