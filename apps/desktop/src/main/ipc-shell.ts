/**
 * 工作区 / 会话 / Agent / 终端 / 窗口 IPC。
 */
import { app, BrowserWindow, ipcMain, shell, type IpcMainInvokeEvent } from "electron"
import { markQuitAllowed } from "./services/window-quit"
import {
  TerminalCloseInput,
  TerminalOpenInput,
  TerminalResizeInput,
  TerminalWriteInput,
  WindowForceQuitInput,
  parseWindowOpenExternalInput,
  WindowSetTaskbarTitleInput
} from "@enjoy-agents/ipc-contract"
import {
  abortAgent,
  decideApproval,
  runAgent,
  steerAgent
} from "./services/agent-runner"
import { inspectPrompt } from "./services/inspect-prompt-service"
import {
  closeWorkspaceTerminal,
  openWorkspaceTerminal,
  resizeWorkspaceTerminal,
  writeWorkspaceTerminal
} from "./services/terminal"
import { queryIsMaximized, toggleMaximize } from "./services/window-maximize"
import { openExternalHttpUrl } from "./services/window-open-external"
import { SSH_HOST_CHANNELS, registerSshHostIpc } from "./ipc-ssh-hosts.ts"
import { registerWorkspaceIpc } from "./ipc-workspace.ts"
import { listInboxStateRows, putInboxStates } from "./services/inbox-state-service"

export const SHELL_CHANNELS = [
  "workspace.open",
  "workspace.pickFolder",
  "workspace.pickFile",
  "workspace.pickSshKey",
  "workspace.remove",
  "workspace.list",
  "workspace.files",
  "workspace.readFile",
  "workspace.writeFile",
  "workspace.move",
  "workspace.watch",
  "workspace.diff",
  "workspace.gitLog",
  "workspace.gitCommit",
  "workspace.gitPush",
  "workspace.gitPatch",
  "workspace.gitRestore",
  "workspace.gitStage",
  "workspace.gitBranches",
  "workspace.gitSwitch",
  "workspace.listCheckpoints",
  "workspace.previewCheckpoint",
  "workspace.restoreCheckpoint",
  "workspace.openPreview",
  "workspace.openSsh",
  "workspace.connect",
  "workspace.disconnect",
  "workspace.retry",
  ...SSH_HOST_CHANNELS,
  "workspace.changes",
  "inbox.state.list",
  "inbox.state.put",
  "agent.run",
  "agent.abort",
  "agent.steer",
  "agent.decide",
  "agent.inspectPrompt",
  "terminal.open",
  "terminal.write",
  "terminal.resize",
  "terminal.close",
  "window.minimize",
  "window.toggleMaximize",
  "window.isMaximized",
  "window.close",
  "window.forceQuit",
  "window.setTaskbarTitle",
  "window.openExternal"
] as const

export function windowFromEvent(event: IpcMainInvokeEvent): BrowserWindow {
  const fromSender = BrowserWindow.fromWebContents(event.sender)
  if (!fromSender || fromSender.isDestroyed()) {
    throw new Error("No UI window for this IPC call.")
  }
  return fromSender
}

export function registerShellIpc() {
  registerWorkspaceIpc()
  registerSshHostIpc()
  registerAgentIpc()
  registerTerminalIpc()
  registerInboxIpc()
  registerWindowIpc()
}

function registerInboxIpc() {
  ipcMain.handle("inbox.state.list", (_event, raw) => listInboxStateRows(raw))
  ipcMain.handle("inbox.state.put", (_event, raw) => putInboxStates(raw))
}

function registerAgentIpc() {
  ipcMain.handle("agent.run", (event, raw) => runAgent(windowFromEvent(event), raw))
  ipcMain.handle("agent.abort", (_event, raw) => abortAgent(raw))
  ipcMain.handle("agent.steer", (event, raw) => steerAgent(windowFromEvent(event), raw))
  ipcMain.handle("agent.decide", (event, raw) => decideApproval(windowFromEvent(event), raw))
  ipcMain.handle("agent.inspectPrompt", (_event, raw) => inspectPrompt(raw))
}

function registerTerminalIpc() {
  ipcMain.handle("terminal.open", async (event, raw) => {
    const input = TerminalOpenInput.parse(raw)
    return openWorkspaceTerminal(input.workspaceId, event.sender)
  })
  ipcMain.handle("terminal.write", async (_event, raw) => {
    const input = TerminalWriteInput.parse(raw)
    writeWorkspaceTerminal(input.sessionId, input.data)
    return { ok: true }
  })
  ipcMain.handle("terminal.resize", async (_event, raw) => {
    const input = TerminalResizeInput.parse(raw)
    resizeWorkspaceTerminal(input.sessionId, input.cols, input.rows)
    return { ok: true }
  })
  ipcMain.handle("terminal.close", async (_event, raw) => {
    closeWorkspaceTerminal(TerminalCloseInput.parse(raw).sessionId)
    return { ok: true }
  })
}

function registerWindowIpc() {
  ipcMain.handle("window.minimize", async (event) => {
    windowFromEvent(event).minimize()
    return { ok: true }
  })
  ipcMain.handle("window.toggleMaximize", async (event) => {
    const win = windowFromEvent(event)
    const isMaximized = toggleMaximize(win)
    if (!win.isDestroyed()) {
      win.webContents.send("window.maximized-changed", { isMaximized })
    }
    return { isMaximized }
  })
  ipcMain.handle("window.isMaximized", async (event) => ({
    isMaximized: queryIsMaximized(windowFromEvent(event))
  }))
  ipcMain.handle("window.close", async (event) => {
    windowFromEvent(event).close()
    return { ok: true }
  })
  ipcMain.handle("window.forceQuit", async (_event, raw) => {
    WindowForceQuitInput.parse(raw ?? {})
    markQuitAllowed()
    app.quit()
    return { ok: true }
  })
  ipcMain.handle("window.setTaskbarTitle", async (event, raw) => {
    const { label } = WindowSetTaskbarTitleInput.parse(raw)
    windowFromEvent(event).setTitle(label ? `${label} — Enjoy Agents` : "Enjoy Agents")
    return { ok: true }
  })
  ipcMain.handle("window.openExternal", async (_event, raw) => {
    const parsed = parseWindowOpenExternalInput(raw)
    if (!parsed.ok) return parsed
    return openExternalHttpUrl(parsed.url, (href) => shell.openExternal(href))
  })
}


