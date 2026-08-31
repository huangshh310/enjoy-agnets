/**
 * 工作区档案：打开 / 列出 / 读文件。host 与 Git 在独立模块。
 */
import { promises as fs } from "node:fs"
import { basename } from "node:path"
import { dialog } from "electron"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { resolveInsideWorkspace } from "./paths"
import { createWorkspaceHost } from "./workspace-host"
import { readFileDiff } from "./workspace-git"

export type WorkspaceRecord = {
  id: string
  name: string
  rootPath: string
}

export { createWorkspaceHost } from "./workspace-host"
export { changedFiles } from "./workspace-git"

export async function openWorkspace(pathHint?: string): Promise<WorkspaceRecord> {
  const rootPath = pathHint ?? (await pickWorkspaceFolder())
  const now = Date.now()
  const existing = getDatabase()
    .prepare("SELECT id, name, root_path as rootPath FROM workspaces WHERE root_path = ?")
    .get(rootPath) as WorkspaceRecord | undefined
  if (existing) {
    getDatabase().prepare("UPDATE workspaces SET updated_at = ? WHERE id = ?").run(now, existing.id)
    return existing
  }
  const record: WorkspaceRecord = {
    id: createId("ws"),
    name: basename(rootPath),
    rootPath
  }
  getDatabase()
    .prepare(
      "INSERT INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(record.id, record.name, record.rootPath, now, now)
  return record
}

export async function listWorkspaces(): Promise<WorkspaceRecord[]> {
  return getDatabase()
    .prepare("SELECT id, name, root_path as rootPath FROM workspaces ORDER BY updated_at DESC")
    .all() as WorkspaceRecord[]
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceRecord> {
  const record = getDatabase()
    .prepare("SELECT id, name, root_path as rootPath FROM workspaces WHERE id = ?")
    .get(workspaceId) as WorkspaceRecord | undefined
  if (!record) throw new Error(`Unknown workspace: ${workspaceId}`)
  return record
}

export async function readWorkspaceFile(workspaceId: string, relativePath: string) {
  const workspace = await getWorkspace(workspaceId)
  return fs.readFile(resolveInsideWorkspace(workspace.rootPath, relativePath), "utf8")
}

export async function listWorkspaceDir(workspaceId: string, relativePath: string) {
  const workspace = await getWorkspace(workspaceId)
  const entries = await createWorkspaceHost(workspace.rootPath).listDir(relativePath)
  return entries.map((entry) => ({
    ...entry,
    path: relativePath === "." ? entry.name : `${relativePath.replace(/\\/g, "/")}/${entry.name}`
  }))
}

export async function readWorkspaceDiff(workspaceId: string, relativePath: string) {
  const workspace = await getWorkspace(workspaceId)
  return readFileDiff(workspace.rootPath, relativePath)
}

async function pickWorkspaceFolder(): Promise<string> {
  const picked = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"]
  })
  if (picked.canceled || !picked.filePaths[0]) {
    throw new Error("No workspace folder selected.")
  }
  return picked.filePaths[0]
}
