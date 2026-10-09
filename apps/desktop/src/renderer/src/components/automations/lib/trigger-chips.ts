/**
 * 列表触发徽章：手动 / cron / 保存后 / webhook · :port，可并存。
 */
import type { Automation, AutomationTrigger } from "@enjoy-agents/ipc-contract"

const FALLBACK_WEBHOOK_PORT = 8765
const ORDER: AutomationTrigger[] = ["manual", "cron", "on_save", "webhook"]

export type TriggerChip = {
  kind: AutomationTrigger
  text: string
  mono?: boolean
}

export function selectedTriggers(item: {
  trigger: AutomationTrigger
  triggers?: AutomationTrigger[]
}): AutomationTrigger[] {
  const unique = new Set<AutomationTrigger>([item.trigger, ...(item.triggers ?? [])])
  return ORDER.filter((kind) => unique.has(kind))
}

export function listTriggerChips(item: Automation): TriggerChip[] {
  return selectedTriggers(item).map((kind) => chipFor(item, kind))
}

function chipFor(item: Automation, kind: AutomationTrigger): TriggerChip {
  if (kind === "cron") return { kind, text: item.cronExpr?.trim() || "", mono: false }
  if (kind === "on_save") return { kind, text: "on_save" }
  if (kind === "webhook") {
    return { kind, text: String(item.webhookPort ?? FALLBACK_WEBHOOK_PORT), mono: false }
  }
  return { kind, text: "manual" }
}

export function webhookPortReady(raw: string): boolean {
  const port = Number(raw)
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

export function toggleTrigger(
  current: AutomationTrigger[],
  next: AutomationTrigger
): AutomationTrigger[] {
  const set = new Set(current)
  if (set.has(next)) {
    if (set.size === 1) return current
    set.delete(next)
  } else {
    set.add(next)
  }
  return ORDER.filter((kind) => set.has(kind))
}
