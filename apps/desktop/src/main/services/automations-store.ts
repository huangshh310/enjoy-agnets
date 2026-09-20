/**
 * Automations 持久化：settings 表里的 JSON 列表。
 * 读取走 Zod 校验，坏条目丢弃，不让手改的 settings 行炸穿消费方。
 */
import {
  Automation,
  type Automation as AutomationType,
  type UpsertAutomationInput
} from "@enjoy-agents/ipc-contract"
import { mergeAutomation } from "./automations-merge"
import { getSetting, setSetting } from "./database"

const runningIds = new Set<string>()

export function readAutomations(): AutomationType[] {
  const raw = getSetting("automations")
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const row = Automation.safeParse(item)
      return row.success ? [row.data] : []
    })
  } catch {
    return []
  }
}

export function writeAutomations(next: AutomationType[]): void {
  setSetting("automations", JSON.stringify(next))
}

export function upsertStoredAutomation(input: UpsertAutomationInput, id: string): AutomationType {
  const current = readAutomations()
  const existing = current.find((item) => item.id === id)
  const nextItem = mergeAutomation(existing, input, id)
  const next = existing
    ? current.map((item) => (item.id === id ? nextItem : item))
    : [nextItem, ...current]
  writeAutomations(next)
  return nextItem
}

export function patchStoredAutomation(
  id: string,
  patch: Partial<AutomationType>
): AutomationType | undefined {
  const current = readAutomations()
  const existing = current.find((item) => item.id === id)
  if (!existing) return undefined
  const nextItem = { ...existing, ...patch, id, updatedAt: Date.now() }
  writeAutomations(current.map((item) => (item.id === id ? nextItem : item)))
  return nextItem
}

export function markAutomationRunning(id: string): void {
  runningIds.add(id)
}

export function markAutomationIdle(id: string): void {
  runningIds.delete(id)
}

export function isAutomationRunning(id: string): boolean {
  return runningIds.has(id)
}

/** list 对外：运行中只来自内存，避免崩溃后永远停在 running。 */
export function presentAutomations(): AutomationType[] {
  return readAutomations().map((row) => ({
    ...row,
    lastRunStatus: runningIds.has(row.id)
      ? "running"
      : row.lastRunStatus === "running"
        ? undefined
        : row.lastRunStatus
  }))
}
