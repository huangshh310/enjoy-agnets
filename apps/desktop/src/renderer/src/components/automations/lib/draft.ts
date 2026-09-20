/**
 * 抽屉草稿 ↔ upsert。开关时带上 cron / 引擎，避免丢字段。
 */
import type { Automation, AutomationMode, AutomationTrigger } from "@enjoy-agents/ipc-contract"

export type AutomationDraft = {
  id?: string
  name: string
  prompt: string
  trigger: AutomationTrigger
  cronExpr: string
  timeZone: string
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
    cronExpr: "0 9 * * *",
    timeZone: defaults.timeZone,
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
    cronExpr: item.cronExpr ?? "0 9 * * *",
    timeZone: item.timeZone ?? defaults.timeZone,
    runtimeId: item.runtimeId ?? defaults.runtimeId,
    modelId: item.modelId ?? "",
    mode: item.mode === "plan" || item.mode === "ask" ? "plan" : "agent",
    enabled: item.enabled
  }
}

export function draftToUpsert(draft: AutomationDraft) {
  return {
    id: draft.id,
    name: draft.name.trim(),
    prompt: draft.prompt.trim(),
    trigger: draft.trigger,
    cronExpr: draft.trigger === "cron" ? draft.cronExpr.trim() : draft.cronExpr.trim() || undefined,
    timeZone: draft.timeZone.trim() || undefined,
    runtimeId: draft.runtimeId.trim() || undefined,
    modelId: draft.modelId.trim() || undefined,
    mode: draft.mode,
    enabled: draft.enabled
  }
}
