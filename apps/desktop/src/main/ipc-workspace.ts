/**
 * 工作区 IPC 注册。SSH 检查点 / preview 禁止把 user@host:path 当成本机根。
 */
import { ipcMain } from "electron"
import {
  FileDiffInput,
  GitCommitInput,
  GitLogInput,
  GitPatchInput,
  GitSwitchInput,
  GitPushInput,
  GitRestoreInput,
  GitStageInput,
  ListDirInput,
  MoveWorkspacePathInput,
  OpenSshWorkspaceInput,
  OpenWorkspaceInput,
  PreviewCheckpointInput,
  ReadFileInput,
  RemoveWorkspaceInput,
  RemoveWorkspaceResult,
  RestoreCheckpointInput,
  WatchWorkspaceInput,
  WorkspaceConnectInput,
  WorkspaceIdInput,
  WriteFileInput
} from "@enjoy-agents/ipc-contract"
import { setSetting } from "./services/database"
import { disconnectedError } from "./services/ssh/ssh-errors.ts"
import { getSshPoolEntry } from "./services/ssh/ssh-pool.ts"
import { connectWorkspace, disconnectWorkspace, openSshWorkspace, retryWorkspace } from "./services/workspace-ssh"
import {
  dispatchChanges,
  dispatchDiff,
  dispatchGitBranches,
  dispatchGitCommit,
  dispatchGitLog,
  dispatchGitPatch,
  dispatchGitPush,
  dispatchGitRestore,
  dispatchGitStage,
  dispatchGitSwitch,
  dispatchMove
} from "./services/workspace-io-dispatch.ts"
import { openWorkspacePreview } from "./services/workspace-open-preview"
import { watchWorkspace } from "./services/workspace-watch"
import { writeWorkspaceFile } from "./services/workspace-write"
import {
  getWorkspace,
  listEnjoyCheckpointItems,
  listWorkspaceDir,
  listWorkspaces,
  openWorkspace,
  pickFile,
  pickFolder,
  pickSshKeyPath,
  previewEnjoyCheckpointRestore,
  readWorkspaceFile,
  removeWorkspace,
  restoreEnjoyCheckpoint
} from "./services/workspace"

export function registerWorkspaceIpc() {
  registerWorkspaceOpenIpc()
  registerWorkspaceFileIpc()
  registerWorkspaceGitIpc()
}

function registerWorkspaceOpenIpc() {
  ipcMain.handle("workspace.open", async (_event, raw) => {
    const input = OpenWorkspaceInput.parse(raw ?? {})
    const workspace = await openWorkspace(input.path, input.name)
    setSetting("lastWorkspaceId", workspace.id)
    return workspace
  })
  ipcMain.handle("workspace.openSsh", async (_event, raw) => {
    const workspace = await openSshWorkspace(OpenSshWorkspaceInput.parse(raw))
    setSetting("lastWorkspaceId", workspace.id)
    return workspace
  })
  ipcMain.handle("workspace.connect", async (_event, raw) => {
    return connectWorkspace(WorkspaceConnectInput.parse(raw).workspaceId)
  })
  ipcMain.handle("workspace.disconnect", async (_event, raw) => {
    return disconnectWorkspace(WorkspaceConnectInput.parse(raw).workspaceId)
  })
  ipcMain.handle("workspace.retry", async (_event, raw) => {
    return retryWorkspace(WorkspaceConnectInput.parse(raw).workspaceId)
  })
  ipcMain.handle("workspace.pickFolder", async () => pickFolder())
  ipcMain.handle("workspace.pickFile", async () => pickFile())
  ipcMain.handle("workspace.pickSshKey", async () => pickSshKeyPath())
  ipcMain.handle("workspace.remove", async (_event, raw) => {
    return RemoveWorkspaceResult.parse(
      await removeWorkspace(RemoveWorkspaceInput.parse(raw).workspaceId)
    )
  })
  ipcMain.handle("workspace.list", async () => listWorkspaces())
}

function registerWorkspaceFileIpc() {
  ipcMain.handle("workspace.files", async (_event, raw) => {
    const input = ListDirInput.parse(raw)
    return listWorkspaceDir(input.workspaceId, input.path)
  })
  ipcMain.handle("workspace.readFile", async (_event, raw) => {
    const input = ReadFileInput.parse(raw)
    return readWorkspaceFile(input.workspaceId, input.path)
  })
  ipcMain.handle("workspace.writeFile", async (_event, raw) => {
    return writeWorkspaceFile(WriteFileInput.parse(raw))
  })
  ipcMain.handle("workspace.move", async (_event, raw) => {
    const input = MoveWorkspacePathInput.parse(raw)
    return dispatchMove(input.workspaceId, input.from, input.toDir)
  })
  ipcMain.handle("workspace.watch", async (_event, raw) => {
    return watchWorkspace(WatchWorkspaceInput.parse(raw).workspaceId)
  })
  ipcMain.handle("workspace.openPreview", async (_event, raw) => openWorkspacePreview(raw))
}

function registerWorkspaceGitIpc() {
  ipcMain.handle("workspace.diff", async (_event, raw) => {
    const input = FileDiffInput.parse(raw)
    return dispatchDiff(input.workspaceId, input.path, input.ignoreWhitespace)
  })
  ipcMain.handle("workspace.changes", async (_event, raw) => {
    return dispatchChanges(WorkspaceIdInput.parse(raw).workspaceId)
  })
  ipcMain.handle("workspace.gitLog", async (_event, raw) => {
    const input = GitLogInput.parse(raw)
    return dispatchGitLog(input.workspaceId, input.limit, input.includeBranchFiles)
  })
  ipcMain.handle("workspace.gitCommit", async (_event, raw) => {
    const input = GitCommitInput.parse(raw)
    return dispatchGitCommit(input.workspaceId, input.message, input.stageAll)
  })
  ipcMain.handle("workspace.gitPush", async (_event, raw) => {
    return dispatchGitPush(GitPushInput.parse(raw).workspaceId)
  })
  ipcMain.handle("workspace.gitPatch", async (_event, raw) => {
    const input = GitPatchInput.parse(raw)
    return dispatchGitPatch(input.workspaceId, input.paths)
  })
  ipcMain.handle("workspace.gitRestore", async (_event, raw) => {
    const input = GitRestoreInput.parse(raw)
    return dispatchGitRestore(input.workspaceId, input.paths)
  })
  ipcMain.handle("workspace.gitStage", async (_event, raw) => {
    const input = GitStageInput.parse(raw)
    return dispatchGitStage(input.workspaceId, input.paths, input.action)
  })
  ipcMain.handle("workspace.gitBranches", async (_event, raw) => {
    return dispatchGitBranches(WorkspaceIdInput.parse(raw).workspaceId)
  })
  ipcMain.handle("workspace.gitSwitch", async (_event, raw) => {
    const input = GitSwitchInput.parse(raw)
    return dispatchGitSwitch(input.workspaceId, input.name)
  })
  registerCheckpointIpc()
}

function registerCheckpointIpc() {
  ipcMain.handle("workspace.listCheckpoints", async (_event, raw) => {
    const ws = await getWorkspace(WorkspaceIdInput.parse(raw).workspaceId)
    assertSshConnected(ws, "git")
    if (ws.kind === "ssh") return { checkpoints: [] }
    return { checkpoints: await listEnjoyCheckpointItems(ws.rootPath) }
  })
  ipcMain.handle("workspace.previewCheckpoint", async (_event, raw) => {
    const input = PreviewCheckpointInput.parse(raw)
    const ws = await getWorkspace(input.workspaceId)
    assertSshConnected(ws, "git")
    refuseSshCheckpoint(ws)
    return previewEnjoyCheckpointRestore(ws.rootPath, input.ref)
  })
  ipcMain.handle("workspace.restoreCheckpoint", async (_event, raw) => {
    const input = RestoreCheckpointInput.parse(raw)
    const ws = await getWorkspace(input.workspaceId)
    assertSshConnected(ws, "git")
    refuseSshCheckpoint(ws)
    return restoreEnjoyCheckpoint(ws.rootPath, input.ref, {
      confirmDeleteUntracked: input.confirmDeleteUntracked
    })
  })
}

function refuseSshCheckpoint(ws: Awaited<ReturnType<typeof getWorkspace>>) {
  if (ws.kind !== "ssh") return
  throw new Error("SSH checkpoints are not available.")
}

function assertSshConnected(ws: Awaited<ReturnType<typeof getWorkspace>>, action: string) {
  if (ws.kind !== "ssh") return
  const live = getSshPoolEntry(ws.id)
  if (live?.status !== "connected") throw disconnectedError(action)
}
