/**
 * 列表胶囊：空闲 / 运行中 / 失败。超时与重启打断不是红失败。
 */
import type { Automation } from "@enjoy-agents/ipc-contract"
import { isNeutralErrorCode } from "./missed-copy"

export type AutomationRowStatus = "idle" | "running" | "failed"

export function automationRowStatus(item: Automation): AutomationRowStatus {
  if (item.lastRunStatus === "running") return "running"
  if (item.lastRunStatus === "failed" && !isNeutralErrorCode(item.lastRunErrorCode)) return "failed"
  return "idle"
}

export function triggerChipText(item: Automation): {
  kind: "cron" | "manual" | "on_save" | "webhook"
  text: string
} {
  if (item.trigger === "cron") return { kind: "cron", text: item.cronExpr?.trim() || "cron" }
  if (item.trigger === "on_save") return { kind: "on_save", text: "on_save" }
  if (item.trigger === "webhook") {
    return { kind: "webhook", text: `webhook · :${item.webhookPort ?? 8765}` }
  }
  return { kind: "manual", text: "manual" }
}
