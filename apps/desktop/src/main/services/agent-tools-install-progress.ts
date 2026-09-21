/**
 * 安装/更新进度推给所有窗口。
 */
import { BrowserWindow } from "electron"
import type { AgentToolInstallProgress } from "@enjoy-agents/ipc-contract"

export function emitInstallProgress(payload: AgentToolInstallProgress) {
  const event: AgentToolInstallProgress = {
    id: payload.id,
    step: payload.step,
    ...(payload.detail ? { detail: payload.detail.slice(0, 200) } : {})
  }
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send("agentTools.progress", event)
  }
}

export function sanitizeInstallLog(raw: string): string | null {
  const line = raw.trim().replace(/\s+/g, " ")
  if (!line) return null
  if (/^\s*at\s/.test(line)) return null
  if (/node_modules[\\/]/.test(line) && !/EACCES|EPERM|ENOTFOUND/i.test(line)) return null
  return line.slice(0, 160)
}
