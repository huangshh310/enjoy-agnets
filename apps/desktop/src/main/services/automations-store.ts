/**
 * Automations 持久化：settings 表里的 JSON 列表。
 */
import type { Automation } from "@enjoy-agents/ipc-contract"
import { getSetting, setSetting } from "./database"

export function readAutomations(): Automation[] {
  const raw = getSetting("automations")
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Automation[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeAutomations(next: Automation[]): void {
  setSetting("automations", JSON.stringify(next))
}
