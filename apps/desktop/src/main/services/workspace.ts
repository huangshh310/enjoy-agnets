/**
 * 工作区档案：打开 / 列出 / 读文件。host 与 Git 在独立模块。
 */
import { promises as fs } from "node:fs"
import { join } from "node:path"
import { dialog } from "electron"
import { resolveKnowledgePath } from "@enjoy-agents/db"
import { getDatabase, getSetting, setSetting } from "./database"
import { deleteSession } from "./session-lifecycle"
import { createId } from "./ids"
import { createWorkspaceHost } from "./workspace-host"
import { readFileDiff } from "./workspace-git"
import { resolveWorkspaceName } from "./workspace-name"

export type WorkspaceRecord = {
  id: string
  name: string
  rootPath: string
}

export { createWorkspaceHost } from "./workspace-host"
export { changedFiles, readGitLog, commitWorkspaceAll } from "./workspace-git"
export { restoreWorkspacePaths } from "./workspace-git-restore"
export { stageWorkspacePaths } from "./workspace-git-stage"
export { listEnjoyCheckpointItems } from "./workspace-git-checkpoint"
export { restoreEnjoyCheckpoint } from "./workspace-git-checkpoint-restore"
export { pushWorkspace, readWorkspacePatch } from "./workspace-git-remote"

/** 只弹出目录选择，不写 workspaces 表。 */
export async function pickFolder(): Promise<{ path: string; name: string }> {
  const path = await pickWorkspaceFolder()
  return { path, name: resolveWorkspaceName(path) }
}

/** 只弹出文件选择，不写 workspaces 表。 */
export async function pickFile(): Promise<{ path: string; name: string } | undefined> {
  const picked = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      {
        name: "Supported Documents",
        extensions: ["md", "ts", "tsx", "js", "jsx", "py", "json", "txt", "pdf", "docx"]
      },
      { name: "All Files", extensions: ["*"] }
    ]
  })
  if (picked.canceled || !picked.filePaths[0]) return undefined
  const p = picked.filePaths[0]
  return { path: p, name: resolveWorkspaceName(p) }
}

export async function openWorkspace(pathHint?: string, name?: string): Promise<WorkspaceRecord> {
  const rootPath = pathHint ?? (await pickWorkspaceFolder())
  const now = Date.now()
  const displayName = resolveWorkspaceName(rootPath, name)
  const existing = getDatabase()
    .prepare("SELECT id, name, root_path as rootPath FROM workspaces WHERE root_path = ?")
    .get(rootPath) as WorkspaceRecord | undefined
  if (existing) {
    if (name?.trim() && displayName !== existing.name) {
      getDatabase()
        .prepare("UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?")
        .run(displayName, now, existing.id)
      return { ...existing, name: displayName }
    }
    getDatabase().prepare("UPDATE workspaces SET updated_at = ? WHERE id = ?").run(now, existing.id)
    return existing
  }
  const record: WorkspaceRecord = {
    id: createId("ws"),
    name: displayName,
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

/**
 * 从应用档案移除项目：删会话与消息，不删磁盘文件夹。
 */
export async function removeWorkspace(workspaceId: string): Promise<{ id: string }> {
  await getWorkspace(workspaceId)
  const sessions = getDatabase()
    .prepare("SELECT id FROM sessions WHERE workspace_id = ?")
    .all(workspaceId) as Array<{ id: string }>
  for (const session of sessions) deleteSession(session.id)
  getDatabase().prepare("DELETE FROM workspaces WHERE id = ?").run(workspaceId)
  if (getSetting("lastWorkspaceId") === workspaceId) {
    const next = (await listWorkspaces())[0]
    setSetting("lastWorkspaceId", next?.id ?? "")
  }
  return { id: workspaceId }
}

export async function readWorkspaceFile(workspaceId: string, relativePath: string) {
  const workspace = await getWorkspace(workspaceId)
  try {
    const resolved = resolveKnowledgePath(workspace.rootPath, relativePath)
    return await fs.readFile(resolved.abs, "utf8")
  } catch (err: unknown) {
    if (isEnoentError(err)) {
      const fileName = relativePath.split(/[\\/]/).pop()
      if (fileName) {
        const foundRel = await findRelativeFile(workspace.rootPath, fileName)
        if (foundRel) {
          const resolved = resolveKnowledgePath(workspace.rootPath, foundRel)
          return await fs.readFile(resolved.abs, "utf8")
        }
      }
    }
    throw err
  }
}

export async function listWorkspaceDir(workspaceId: string, relativePath: string) {
  const workspace = await getWorkspace(workspaceId)
  const entries = await createWorkspaceHost(workspace.rootPath).listDir(relativePath)
  return entries.map((entry) => ({
    ...entry,
    path: relativePath === "." ? entry.name : `${relativePath.replace(/\\/g, "/")}/${entry.name}`
  }))
}

export async function readWorkspaceDiff(
  workspaceId: string,
  relativePath: string,
  ignoreWhitespace = false
) {
  const workspace = await getWorkspace(workspaceId)
  try {
    return await readFileDiff(workspace.rootPath, relativePath, ignoreWhitespace)
  } catch (err: unknown) {
    const fileName = relativePath.split(/[\\/]/).pop()
    if (fileName) {
      const foundRel = await findRelativeFile(workspace.rootPath, fileName)
      if (foundRel) {
        return await readFileDiff(workspace.rootPath, foundRel, ignoreWhitespace)
      }
    }
    throw err
  }
}

function isEnoentError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return err.code === "ENOENT"
  }
  return false
}

const IGNORED_SEARCH_DIRS = new Set(["node_modules", ".git", "dist", "out", ".next", ".turbo", "coverage", "build"])

async function findRelativeFile(rootPath: string, fileName: string): Promise<string | null> {
  const target = fileName.toLowerCase()
  async function walk(dir: string, relPrefix: string): Promise<string | null> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return null
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_SEARCH_DIRS.has(entry.name)) continue
        const sub = await walk(join(dir, entry.name), relPrefix ? `${relPrefix}/${entry.name}` : entry.name)
        if (sub) return sub
      } else if (entry.name.toLowerCase() === target) {
        return relPrefix ? `${relPrefix}/${entry.name}` : entry.name
      }
    }
    return null
  }
  return walk(rootPath, "")
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
