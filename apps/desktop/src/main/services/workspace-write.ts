/**
 * 用户保存工作区文件：路径 jail，不走 HMAC（人点的保存）。
 */
import { promises as fs } from "node:fs"
import { dirname } from "node:path"
import { BrowserWindow } from "electron"
import { resolveKnowledgePath } from "@enjoy-agents/db"
import { fireOnSaveAutomations } from "./automations-run"
import { createWorkspaceHost, getWorkspace } from "./workspace"
import { resolveWorkspaceHost } from "./workspace-host-factory"

export async function writeWorkspaceFile(input: {
  workspaceId: string
  path: string
  content: string
  sessionId?: string
}): Promise<{ ok: true; path: string }> {
  const workspace = await getWorkspace(input.workspaceId)
  if (workspace.kind === "ssh") {
    await resolveWorkspaceHost(workspace, undefined, createWorkspaceHost).writeFile(input.path, input.content)
  } else {
    const resolved = resolveKnowledgePath(workspace.rootPath, input.path)
    await fs.mkdir(dirname(resolved.abs), { recursive: true })
    await fs.writeFile(resolved.abs, input.content, "utf8")
  }
  const window = BrowserWindow.getAllWindows().find((item) => !item.isDestroyed())
  fireOnSaveAutomations(window, input.workspaceId, input.sessionId)
  return { ok: true, path: input.path }
}
