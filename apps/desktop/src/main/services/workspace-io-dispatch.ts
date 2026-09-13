/**
 * 工作区 IO 按 kind 分流：local 走现有 rootPath，ssh 走 host。
 */
import { getWorkspace } from "./workspace.ts"
import {
  changedFiles,
  commitWorkspaceAll,
  readFileDiff,
  readGitLog
} from "./workspace-git.ts"
import { readWorkspacePatch, pushWorkspace } from "./workspace-git-remote.ts"
import { restoreWorkspacePaths } from "./workspace-git-restore.ts"
import { stageWorkspacePaths } from "./workspace-git-stage.ts"
import { moveWorkspacePath as moveLocal } from "./workspace-move.ts"
import { disconnectedError } from "./ssh/ssh-errors.ts"
import { getSshPoolEntry } from "./ssh/ssh-pool.ts"
import { createWorkspaceHost } from "./workspace-host.ts"
import { resolveWorkspaceHost } from "./workspace-host-factory.ts"
import {
  sshWorkspaceChanges,
  sshWorkspaceDiff,
  sshWorkspaceGitLog,
  sshWorkspaceMove,
  sshWorkspacePatch,
  sshWorkspaceRestore,
  sshWorkspaceStage
} from "./workspace-ssh-io.ts"
import type { WorkspaceRecord } from "./workspace-record.ts"

function hostForWorkspace(record: WorkspaceRecord) {
  return resolveWorkspaceHost(record, undefined, createWorkspaceHost)
}

function assertConnected(ws: WorkspaceRecord, action: string) {
  if (ws.kind !== "ssh") return
  if (getSshPoolEntry(ws.id)?.status !== "connected") throw disconnectedError(action)
}

export async function dispatchChanges(workspaceId: string) {
  const ws = await getWorkspace(workspaceId)
  assertConnected(ws, "git")
  if (ws.kind === "ssh") return sshWorkspaceChanges(hostForWorkspace(ws))
  return changedFiles(ws.rootPath)
}

export async function dispatchGitLog(
  workspaceId: string,
  limit?: number,
  includeBranchFiles?: boolean
) {
  const ws = await getWorkspace(workspaceId)
  assertConnected(ws, "git")
  if (ws.kind === "ssh") return sshWorkspaceGitLog(hostForWorkspace(ws), limit)
  return readGitLog(ws.rootPath, limit ?? 30, includeBranchFiles ?? false)
}

export async function dispatchGitCommit(workspaceId: string, message: string, stageAll?: boolean) {
  const ws = await getWorkspace(workspaceId)
  assertConnected(ws, "git")
  if (ws.kind === "ssh") {
    const output = await hostForWorkspace(ws).gitCommit(message, { stageAll })
    return { ok: true as const, output }
  }
  return commitWorkspaceAll(ws.rootPath, message, stageAll)
}

export async function dispatchGitPush(workspaceId: string) {
  const ws = await getWorkspace(workspaceId)
  assertConnected(ws, "git")
  if (ws.kind === "ssh") {
    const output = await hostForWorkspace(ws).gitPush()
    return { ok: true as const, output }
  }
  return pushWorkspace(ws.rootPath)
}

export async function dispatchGitPatch(workspaceId: string, paths?: string[]) {
  const ws = await getWorkspace(workspaceId)
  assertConnected(ws, "git")
  if (ws.kind === "ssh") return { patch: await sshWorkspacePatch(hostForWorkspace(ws), paths) }
  return { patch: await readWorkspacePatch(ws.rootPath, paths) }
}

export async function dispatchGitRestore(workspaceId: string, paths: string[]) {
  const ws = await getWorkspace(workspaceId)
  assertConnected(ws, "git")
  if (ws.kind === "ssh") {
    return sshWorkspaceRestore(hostForWorkspace(ws), ws.remotePath || ".", paths)
  }
  return restoreWorkspacePaths(ws.rootPath, paths)
}

export async function dispatchGitStage(
  workspaceId: string,
  paths: string[],
  action: "add" | "unstage"
) {
  const ws = await getWorkspace(workspaceId)
  assertConnected(ws, "git")
  if (ws.kind === "ssh") {
    return sshWorkspaceStage(hostForWorkspace(ws), ws.remotePath || ".", paths, action)
  }
  return stageWorkspacePaths(ws.rootPath, paths, action)
}

export async function dispatchDiff(
  workspaceId: string,
  path: string,
  ignoreWhitespace?: boolean
) {
  const ws = await getWorkspace(workspaceId)
  assertConnected(ws, "diff")
  if (ws.kind === "ssh") return sshWorkspaceDiff(hostForWorkspace(ws), path)
  return readFileDiff(ws.rootPath, path, ignoreWhitespace)
}

export async function dispatchMove(workspaceId: string, from: string, toDir: string) {
  const ws = await getWorkspace(workspaceId)
  assertConnected(ws, "move")
  if (ws.kind === "ssh") {
    return sshWorkspaceMove(hostForWorkspace(ws), ws.remotePath || ".", from, toDir)
  }
  return moveLocal({ workspaceId, from, toDir })
}
