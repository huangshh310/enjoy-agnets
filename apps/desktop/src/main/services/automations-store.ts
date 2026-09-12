/**
 * Automations 持久化：settings 表里的 JSON 列表。
 * 读取走 Zod 校验，坏条目丢弃，不让手改的 settings 行炸穿消费方。
 */
import { Automation, type Automation as AutomationType } from "@enjoy-agents/ipc-contract"
import { getSetting, setSetting } from "./database"

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
