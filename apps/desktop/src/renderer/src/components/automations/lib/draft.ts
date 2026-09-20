/**
 * 抽屉草稿 ↔ upsert。开关时带上 cron / webhook / 引擎，避免丢字段。
 */
import type { Automation, AutomationMode, AutomationTrigger } from "@enjoy-agents/ipc-contract"
import { selectedTriggers, webhookPortReady } from "./trigger-chips"

export type AutomationDraft = {
  id?: string
  name: string
  prompt: string
  trigger: AutomationTrigger
  triggers: AutomationTrigger[]
  cronExpr: string
  timeZone: string
  webhookPort: string
  webhookPath: string
  webhookSecret: string
  runtimeId: string
  modelId: string
  mode: AutomationMode
  enabled: boolean
}

export function emptyAutomationDraft(defaults: {
  runtimeId: string
  timeZone: string
}): AutomationDraft {
  return {
    name: "",
    prompt: "",
    trigger: "manual",
    triggers: ["manual"],
    cronExpr: "0 9 * * *",
    timeZone: defaults.timeZone,
    webhookPort: "8765",
    webhookPath: "/hooks/enjoy",
    webhookSecret: "",
    runtimeId: defaults.runtimeId,
    modelId: "",
    mode: "agent",
    enabled: true
  }
}

export function draftFromAutomation(
  item: Automation,
  defaults: { runtimeId: string; timeZone: string }
): AutomationDraft {
  return {
    id: item.id,
    name: item.name,
    prompt: item.prompt,
    trigger: item.trigger,
    triggers: selectedTriggers(item),
    cronExpr: item.cronExpr ?? "0 9 * * *",
    timeZone: item.timeZone ?? defaults.timeZone,
    webhookPort: item.webhookPort != null ? String(item.webhookPort) : "8765",
    webhookPath: item.webhookPath ?? "/hooks/enjoy",
    webhookSecret: item.webhookSecret ?? "",
    runtimeId: item.runtimeId ?? defaults.runtimeId,
    modelId: item.modelId ?? "",
    mode: item.mode === "plan" || item.mode === "ask" ? "plan" : "agent",
    enabled: item.enabled
  }
}

export function draftToUpsert(draft: AutomationDraft) {
  const port = Number(draft.webhookPort)
  return {
    id: draft.id,
    name: draft.name.trim(),
    prompt: draft.prompt.trim(),
    trigger: draft.triggers[0] ?? draft.trigger,
    triggers: draft.triggers,
    cronExpr: draft.triggers.includes("cron") ? draft.cronExpr.trim() : draft.cronExpr.trim() || undefined,
    timeZone: draft.timeZone.trim() || undefined,
    webhookPort: webhookPortReady(draft.webhookPort) ? port : undefined,
    webhookPath: draft.webhookPath.trim() || undefined,
    webhookSecret: draft.webhookSecret.trim(),
    runtimeId: draft.runtimeId.trim() || undefined,
    modelId: draft.modelId.trim() || undefined,
    mode: draft.mode,
    enabled: draft.enabled
  }
}
