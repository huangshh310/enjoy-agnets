/**
 * Automations IPC：列表 / 写入 / 删除，存在 settings 键。
 */
import { ipcMain } from "electron"
import { AutomationIdInput, UpsertAutomationInput, type Automation } from "@enjoy-agents/ipc-contract"
import { getSetting, setSetting } from "./services/database"
import { createId } from "./services/ids"

export function registerAutomationIpc() {
  ipcMain.handle("automations.list", async () => readAutomations())
  ipcMain.handle("automations.upsert", async (_event, raw) => {
    const input = UpsertAutomationInput.parse(raw)
    const current = readAutomations()
    const id = input.id ?? createId("auto")
    const nextItem: Automation = {
      id,
      name: input.name,
      prompt: input.prompt,
      trigger: input.trigger,
      enabled: input.enabled,
      updatedAt: Date.now()
    }
    const next = current.some((item) => item.id === id)
      ? current.map((item) => (item.id === id ? nextItem : item))
      : [nextItem, ...current]
    setSetting("automations", JSON.stringify(next))
    return nextItem
  })
  ipcMain.handle("automations.remove", async (_event, raw) => {
    const id = AutomationIdInput.parse(raw).id
    setSetting("automations", JSON.stringify(readAutomations().filter((item) => item.id !== id)))
    return { ok: true }
  })
}

function readAutomations(): Automation[] {
  const raw = getSetting("automations")
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Automation[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
