/**
 * Automations 模版与筛选类型。文案走 i18n。
 */
import type { AutomationTrigger } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"

export type AutomationFilter = "all" | "manual" | "on_save"

export type AutomationTemplate = {
  id: string
  name: string
  trigger: AutomationTrigger
  category: string
  prompt: string
  badge: string
}

export function getAutomationTemplates(t: TranslateFn): AutomationTemplate[] {
  return [
    automationTemplate(t, "tpl-diffs", "diffs", "on_save"),
    automationTemplate(t, "tpl-todos", "todos", "on_save"),
    automationTemplate(t, "tpl-typecheck", "typecheck", "manual"),
    automationTemplate(t, "tpl-commit-notes", "commitNotes", "manual")
  ]
}

function automationTemplate(
  t: TranslateFn,
  id: string,
  key: string,
  trigger: AutomationTrigger
): AutomationTemplate {
  const base = `studio.automationTemplates.${key}`
  return {
    id,
    name: t(`${base}.name`),
    trigger,
    category: t(`${base}.category`),
    prompt: t(`${base}.prompt`),
    badge: t(`${base}.badge`)
  }
}
