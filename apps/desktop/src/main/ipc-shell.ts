/**
 * 工作区 / 会话 / Agent / 终端 / 窗口 IPC。
 */
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron"
import {
  FileDiffInput,
  ListDirInput,
  OpenWorkspaceInput,
  ReadFileInput,
  SessionRenameInput,
  TerminalCloseInput,
  TerminalOpenInput,
  TerminalWriteInput
} from "@enjoy-agents/ipc-contract"
import {
  abortAgent,
  createSession,
  decideApproval,
  listMessages,
  listSessions,
  runAgent
} from "./services/agent-runner"
import { setSetting } from "./services/database"
import { renameSession } from "./services/persist-session"
import {
  closeWorkspaceTerminal,
  openWorkspaceTerminal,
  writeWorkspaceTerminal
} from "./services/terminal"
import {
  changedFiles,
  getWorkspace,
  listWorkspaces,
  listWorkspaceDir,
  openWorkspace,
  readWorkspaceDiff,
  readWorkspaceFile
} from "./services/workspace"

export const SHELL_CHANNELS = [
  "workspace.open",
  "workspace.list",
  "workspace.files",
  "workspace.readFile",
  "workspace.diff",
  "workspace.changes",
  "session.list",
  "session.create",
  "session.messages",
  "session.rename",
  "agent.run",
  "agent.abort",
  "agent.decide",
  "terminal.open",
  "terminal.write",
  "terminal.close",
  "window.minimize",
  "window.toggleMaximize",
  "window.isMaximized",
  "window.close"
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
  registerSessionIpc()
  registerAgentIpc()
  registerTerminalIpc()
  registerWindowIpc()
}

function registerWorkspaceIpc() {
  ipcMain.handle("workspace.open", async (_event, raw) => {
    const workspace = await openWorkspace(OpenWorkspaceInput.parse(raw ?? {}).path)
    setSetting("lastWorkspaceId", workspace.id)
    return workspace
  })
  ipcMain.handle("workspace.list", async () => listWorkspaces())
  ipcMain.handle("workspace.files", async (_event, raw) => {
    const input = ListDirInput.parse(raw)
    return listWorkspaceDir(input.workspaceId, input.path)
  })
  ipcMain.handle("workspace.readFile", async (_event, raw) => {
    const input = ReadFileInput.parse(raw)
    return readWorkspaceFile(input.workspaceId, input.path)
  })
  ipcMain.handle("workspace.diff", async (_event, raw) => {
    const input = FileDiffInput.parse(raw)
    return readWorkspaceDiff(input.workspaceId, input.path)
  })
  ipcMain.handle("workspace.changes", async (_event, workspaceId: string) => {
    return changedFiles((await getWorkspace(workspaceId)).rootPath)
  })
}

function registerSessionIpc() {
  ipcMain.handle("session.list", async (_event, workspaceId: string) => listSessions(workspaceId))
  ipcMain.handle("session.create", async (_event, workspaceId: string, title?: string) =>
    createSession(workspaceId, title || "New agent")
  )
  ipcMain.handle("session.messages", async (_event, sessionId: string) => listMessages(sessionId))
  ipcMain.handle("session.rename", async (_event, raw: unknown) => {
    const input = SessionRenameInput.parse(raw)
    return renameSession(input.sessionId, input.title)
  })
}

function registerAgentIpc() {
  ipcMain.handle("agent.run", (event, raw) => runAgent(windowFromEvent(event), raw))
  ipcMain.handle("agent.abort", (_event, raw) => abortAgent(raw))
  ipcMain.handle("agent.decide", (event, raw) => decideApproval(windowFromEvent(event), raw))
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
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return { isMaximized: win.isMaximized() }
  })
  ipcMain.handle("window.isMaximized", async (event) => ({
    isMaximized: windowFromEvent(event).isMaximized()
  }))
  ipcMain.handle("window.close", async (event) => {
    windowFromEvent(event).close()
    return { ok: true }
  })
}
