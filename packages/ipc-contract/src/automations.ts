/**
 * Automations 列表与 upsert。
 */
import { z } from "zod"

export const AutomationTrigger = z.enum(["manual", "on_save"])
export type AutomationTrigger = z.infer<typeof AutomationTrigger>

export const Automation = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  trigger: AutomationTrigger,
  enabled: z.boolean(),
  updatedAt: z.number()
})
export type Automation = z.infer<typeof Automation>

export const UpsertAutomationInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  prompt: z.string(),
  trigger: AutomationTrigger,
  enabled: z.boolean().default(true)
})
export type UpsertAutomationInput = z.infer<typeof UpsertAutomationInput>

export const AutomationIdInput = z
  .object({
    id: z.string().min(1)
  })
  .strict()
export type AutomationIdInput = z.infer<typeof AutomationIdInput>

/** 立刻用当前会话跑一条自动化。 */
export const RunAutomationInput = z
  .object({
    id: z.string().min(1),
    sessionId: z.string().min(1),
    workspaceId: z.string().min(1)
  })
  .strict()
export type RunAutomationInput = z.infer<typeof RunAutomationInput>
