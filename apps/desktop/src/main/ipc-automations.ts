/**
 * Automations IPC：列表 / 写入 / 删除 / 开一轮。
 */
import { ipcMain } from "electron"
import {
  AutomationIdInput,
  RunAutomationInput,
  UpsertAutomationInput
} from "@enjoy-agents/ipc-contract"
import { parseCronExpr } from "./services/automations-cron"
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

export function registerAutomationIpc() {
  ipcMain.handle("automations.list", async () => presentAutomations())
  ipcMain.handle("automations.upsert", async (_event, raw) => {
    const input = UpsertAutomationInput.parse(raw)
    if (input.trigger === "cron" && !parseCronExpr(input.cronExpr ?? "")) {
      throw new Error("Invalid cron expression.")
    }
    if (input.trigger === "webhook" && input.webhookPort == null) {
      throw new Error("Webhook port is required.")
    }
    const id = input.id ?? createId("auto")
    const nextItem = upsertStoredAutomation(input, id)
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
