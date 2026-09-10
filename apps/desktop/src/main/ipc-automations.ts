/**
 * Automations IPC：列表 / 写入 / 删除 / 执行。
 */
import { ipcMain } from "electron"
import {
  AutomationIdInput,
  RunAutomationInput,
  UpsertAutomationInput,
  type Automation
} from "@enjoy-agents/ipc-contract"
import { runAutomation } from "./services/automations-run"
import { readAutomations, writeAutomations } from "./services/automations-store"
import { createId } from "./services/ids"
import { windowFromEvent } from "./ipc-shell"

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
    writeAutomations(next)
    return nextItem
  })
  ipcMain.handle("automations.remove", async (_event, raw) => {
    const id = AutomationIdInput.parse(raw).id
    writeAutomations(readAutomations().filter((item) => item.id !== id))
    return { ok: true }
  })
  ipcMain.handle("automations.run", async (event, raw) => {
    const input = RunAutomationInput.parse(raw)
    return runAutomation(windowFromEvent(event), input)
  })
}
