/**
 * 列表胶囊：空闲 / 运行中 / 失败。成功也回空闲，不要「待验收」。
 */
import type { Automation } from "@enjoy-agents/ipc-contract"

export type AutomationRowStatus = "idle" | "running" | "failed"

export function automationRowStatus(item: Automation): AutomationRowStatus {
  if (item.lastRunStatus === "running") return "running"
  if (item.lastRunStatus === "failed") return "failed"
  return "idle"
}

export function triggerChipText(item: Automation): { kind: "cron" | "manual" | "on_save"; text: string } {
  if (item.trigger === "cron") return { kind: "cron", text: item.cronExpr?.trim() || "cron" }
  if (item.trigger === "on_save") return { kind: "on_save", text: "on_save" }
  return { kind: "manual", text: "manual" }
}
