/**
 * 工作区 / 会话 / Agent / 终端 / 窗口 IPC。
 */
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron"
import {
  FileDiffInput,
  GitCommitInput,
  GitLogInput,
  GitPatchInput,
  GitPushInput,
  GitRestoreInput,
  RestoreCheckpointInput,
  ListDirInput,
  OpenWorkspaceInput,
  ReadFileInput,
  RemoveWorkspaceInput,
  SessionCompactInput,
  SessionCreateInput,
  SessionIdInput,
  SessionRenameInput,
  TerminalCloseInput,
  TerminalOpenInput,
  TerminalWriteInput,
  WorkspaceIdInput
} from "@enjoy-agents/ipc-contract"
import {
  abortAgent,
  createSession,
  decideApproval,
  listMessages,
  listSessions,
  runAgent,
  steerAgent
} from "./services/agent-runner"
import { inspectPrompt } from "./services/inspect-prompt-service"
import { setSetting } from "./services/database"
import { renameSession } from "./services/persist-session"
import {
  closeWorkspaceTerminal,
  openWorkspaceTerminal,
  writeWorkspaceTerminal
} from "./services/terminal"
import { queryIsMaximized, toggleMaximize } from "./services/window-maximize"
import {
  changedFiles,
  commitWorkspaceAll,
  getWorkspace,
  listWorkspaceDir,
  listWorkspaces,
  openWorkspace,
  pickFile,
  pickFolder,
  pushWorkspace,
  readGitLog,
  readWorkspaceDiff,
  readWorkspaceFile,
  readWorkspacePatch,
  removeWorkspace,
  restoreWorkspacePaths,
  listEnjoyCheckpointItems,
  restoreEnjoyCheckpoint
} from "./services/workspace"
import {
  archiveSession,
  deleteAllArchivedSessions,
  deleteSession,
  listArchivedSessions,
  unarchiveSession
} from "./services/session-lifecycle"
import {
  clearSessionCompaction,
  compactSession,
  getSessionCompaction
} from "./services/session-compaction-service"

export const SHELL_CHANNELS = [
  "workspace.open",
  "workspace.pickFolder",
  "workspace.pickFile",
  "workspace.remove",
  "workspace.list",
  "workspace.files",
  "workspace.readFile",
  "workspace.diff",
  "workspace.gitLog",
  "workspace.gitCommit",
  "workspace.gitPush",
  "workspace.gitPatch",
  "workspace.gitRestore",
  "workspace.listCheckpoints",
  "workspace.restoreCheckpoint",
  "workspace.changes",
  "session.list",
  "session.listArchived",
  "session.create",
  "session.messages",
  "session.rename",
  "session.archive",
  "session.unarchive",
  "session.delete",
  "session.deleteArchived",
  "session.compact",
  "session.getCompaction",
  "session.clearCompaction",
  "agent.run",
  "agent.abort",
  "agent.steer",
  "agent.decide",
  "agent.inspectPrompt",
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
    const input = OpenWorkspaceInput.parse(raw ?? {})
    const workspace = await openWorkspace(input.path, input.name)
    setSetting("lastWorkspaceId", workspace.id)
    return workspace
  })
  ipcMain.handle("workspace.pickFolder", async () => pickFolder())
  ipcMain.handle("workspace.pickFile", async () => pickFile())
  ipcMain.handle("workspace.remove", async (_event, raw) => {
    return removeWorkspace(RemoveWorkspaceInput.parse(raw).workspaceId)
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
    return readWorkspaceDiff(input.workspaceId, input.path, input.ignoreWhitespace)
  })
  ipcMain.handle("workspace.changes", async (_event, raw) => {
    const workspaceId = WorkspaceIdInput.parse(raw).workspaceId
    return changedFiles((await getWorkspace(workspaceId)).rootPath)
  })
  ipcMain.handle("workspace.gitLog", async (_event, raw) => {
    const input = GitLogInput.parse(raw)
    const ws = await getWorkspace(input.workspaceId)
    return readGitLog(ws.rootPath, input.limit ?? 30, input.includeBranchFiles ?? false)
  })
  ipcMain.handle("workspace.gitCommit", async (_event, raw) => {
    const input = GitCommitInput.parse(raw)
    const ws = await getWorkspace(input.workspaceId)
    return commitWorkspaceAll(ws.rootPath, input.message, input.stageAll)
  })
  ipcMain.handle("workspace.gitPush", async (_event, raw) => {
    const input = GitPushInput.parse(raw)
    const ws = await getWorkspace(input.workspaceId)
    return pushWorkspace(ws.rootPath)
  })
  ipcMain.handle("workspace.gitPatch", async (_event, raw) => {
    const input = GitPatchInput.parse(raw)
    const ws = await getWorkspace(input.workspaceId)
    return { patch: await readWorkspacePatch(ws.rootPath, input.paths) }
  })
  ipcMain.handle("workspace.gitRestore", async (_event, raw) => {
    const input = GitRestoreInput.parse(raw)
    const ws = await getWorkspace(input.workspaceId)
    return restoreWorkspacePaths(ws.rootPath, input.paths)
  })
  ipcMain.handle("workspace.listCheckpoints", async (_event, raw) => {
    const workspaceId = WorkspaceIdInput.parse(raw).workspaceId
    const ws = await getWorkspace(workspaceId)
    return { checkpoints: await listEnjoyCheckpointItems(ws.rootPath) }
  })
  ipcMain.handle("workspace.restoreCheckpoint", async (_event, raw) => {
    const input = RestoreCheckpointInput.parse(raw)
    const ws = await getWorkspace(input.workspaceId)
    return restoreEnjoyCheckpoint(ws.rootPath, input.ref)
  })
}

function registerSessionIpc() {
  ipcMain.handle("session.list", async (_event, raw) =>
    listSessions(WorkspaceIdInput.parse(raw).workspaceId)
  )
  ipcMain.handle("session.listArchived", async () => listArchivedSessions())
  ipcMain.handle("session.create", async (_event, raw) => {
    const input = SessionCreateInput.parse(raw)
    return createSession(input.workspaceId, input.title || "New agent")
  })
  ipcMain.handle("session.messages", async (_event, raw) =>
    listMessages(SessionIdInput.parse(raw).sessionId)
  )
  ipcMain.handle("session.rename", async (_event, raw: unknown) => {
    const input = SessionRenameInput.parse(raw)
    return renameSession(input.sessionId, input.title)
  })
  ipcMain.handle("session.archive", async (_event, raw) =>
    archiveSession(SessionIdInput.parse(raw).sessionId)
  )
  ipcMain.handle("session.unarchive", async (_event, raw) =>
    unarchiveSession(SessionIdInput.parse(raw).sessionId)
  )
  ipcMain.handle("session.delete", async (_event, raw) =>
    deleteSession(SessionIdInput.parse(raw).sessionId)
  )
  ipcMain.handle("session.deleteArchived", async () => deleteAllArchivedSessions())
  ipcMain.handle("session.compact", async (_event, raw) => {
    const input = SessionCompactInput.parse(raw)
    return compactSession(input.sessionId, input.keepRecent)
  })
  ipcMain.handle("session.getCompaction", async (_event, raw) => {
    const input = SessionIdInput.parse(raw)
    return getSessionCompaction(input.sessionId)
  })
  ipcMain.handle("session.clearCompaction", async (_event, raw) => {
    const input = SessionIdInput.parse(raw)
    return clearSessionCompaction(input.sessionId)
  })
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
}
