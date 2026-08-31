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
