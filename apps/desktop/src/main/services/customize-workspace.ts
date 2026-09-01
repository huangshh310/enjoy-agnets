/**
 * Customize IPC 只信库内工作区根，不信 renderer 随便给的路径。
 */
import { getSetting } from "./database"
import { matchRegisteredWorkspace } from "./customize-roots.ts"
import { listWorkspaces } from "./workspace"

export async function registeredWorkspaceRoots(): Promise<string[]> {
  return (await listWorkspaces()).map((workspace) => workspace.rootPath)
}

export async function resolveCustomizeWorkspace(requested?: string): Promise<string | undefined> {
  const workspaces = await listWorkspaces()
  const roots = workspaces.map((workspace) => workspace.rootPath)
  if (requested) return matchRegisteredWorkspace(requested, roots)
  const lastId = getSetting("lastWorkspaceId")
  return workspaces.find((workspace) => workspace.id === lastId)?.rootPath ?? roots[0]
}
