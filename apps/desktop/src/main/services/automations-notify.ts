/**
 * 推 automations.changed，让列表与会话树刷新。不是第二套铃。
 */
import { BrowserWindow } from "electron"
import {
  AutomationsChangedEvent,
  type AutomationsChangedEvent as Changed
} from "@enjoy-agents/ipc-contract"

export function emitAutomationsChanged(reason: Changed["reason"], id?: string): void {
  const payload = AutomationsChangedEvent.parse({ reason, id })
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send("automations.changed", payload)
  }
}

export function firstLiveWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows().find((window) => !window.isDestroyed())
}
