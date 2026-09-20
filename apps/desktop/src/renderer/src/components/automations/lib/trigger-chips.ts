/**
 * 列表触发徽章：手动 / cron / 保存后 / webhook · :port，可并存。
 */
import type { Automation, AutomationTrigger } from "@enjoy-agents/ipc-contract"

const FALLBACK_WEBHOOK_PORT = 8765

export type TriggerChip = {
  kind: AutomationTrigger
  text: string
  mono?: boolean
}

export function listTriggerChips(item: Automation): TriggerChip[] {
  if (item.trigger === "cron") {
    return [{ kind: "cron", text: item.cronExpr?.trim() || "cron", mono: true }]
  }
  if (item.trigger === "on_save") {
    return [{ kind: "on_save", text: "on_save" }]
  }
  if (item.trigger === "webhook") {
    const port = item.webhookPort ?? FALLBACK_WEBHOOK_PORT
    return [{ kind: "webhook", text: `webhook · :${port}`, mono: true }]
  }
  return [{ kind: "manual", text: "manual" }]
}

export function webhookPortReady(raw: string): boolean {
  const port = Number(raw)
  return Number.isInteger(port) && port >= 1 && port <= 65535
}
