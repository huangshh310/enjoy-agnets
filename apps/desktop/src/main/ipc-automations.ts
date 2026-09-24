/**
 * Automations IPC：列表 / 写入 / 删除 / 开一轮。
 */
import { ipcMain } from "electron"
import {
  AutomationIdInput,
  RunAutomationInput,
  UpsertAutomationInput
} from "@enjoy-agents/ipc-contract"
import { compileCadence } from "./services/automations-cron"
import { emitAutomationsChanged } from "./services/automations-notify"
import { runAutomation } from "./services/automations-run"
import {
  presentAutomations,
  readAutomations,
  upsertStoredAutomation,
  writeAutomations
} from "./services/automations-store"
import { syncWebhookListeners } from "./services/automations-webhook"
import { createId } from "./services/ids"
import { windowFromEvent } from "./ipc-shell"

function compiledCron(needsCron: boolean, raw: string | undefined): string | undefined {
  if (!needsCron) return raw
  const compiled = compileCadence(raw ?? "")
  if (!compiled) throw new Error("Invalid cron expression.")
  return compiled
}

export function registerAutomationIpc() {
  ipcMain.handle("automations.list", async () => presentAutomations())
  ipcMain.handle("automations.upsert", async (_event, raw) => {
    const input = UpsertAutomationInput.parse(raw)
    const kinds = new Set([input.trigger, ...(input.triggers ?? [])])
    const cronExpr = compiledCron(kinds.has("cron"), input.cronExpr)
    if (kinds.has("webhook") && input.webhookPort == null) {
      throw new Error("Webhook port is required.")
    }
    const id = input.id ?? createId("auto")
    const nextItem = upsertStoredAutomation({ ...input, cronExpr }, id)
    await syncWebhookListeners()
    emitAutomationsChanged("upsert", nextItem.id)
    return nextItem
  })
  ipcMain.handle("automations.remove", async (_event, raw) => {
    const id = AutomationIdInput.parse(raw).id
    writeAutomations(readAutomations().filter((item) => item.id !== id))
    await syncWebhookListeners()
    emitAutomationsChanged("remove", id)
    return { ok: true }
  })
  ipcMain.handle("automations.run", async (event, raw) => {
    const input = RunAutomationInput.parse(raw)
    return runAutomation(windowFromEvent(event), input)
  })
}
