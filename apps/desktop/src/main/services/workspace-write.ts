/**
 * 用户保存工作区文件：路径 jail，不走 HMAC（人点的保存）。
 */
import { promises as fs } from "node:fs"
import { dirname } from "node:path"
import { BrowserWindow } from "electron"
import { resolveKnowledgePath } from "@enjoy-agents/db"
import { fireOnSaveAutomations } from "./automations-run"
import { getWorkspace } from "./workspace"

export async function writeWorkspaceFile(input: {
  workspaceId: string
  path: string
  content: string
  sessionId?: string
}): Promise<{ ok: true; path: string }> {
  const workspace = await getWorkspace(input.workspaceId)
  const resolved = resolveKnowledgePath(workspace.rootPath, input.path)
  await fs.mkdir(dirname(resolved.abs), { recursive: true })
  await fs.writeFile(resolved.abs, input.content, "utf8")
  if (input.sessionId) {
    const window = BrowserWindow.getAllWindows().find((item) => !item.isDestroyed())
    await fireOnSaveAutomations(window, input.workspaceId, input.sessionId)
  }
  return { ok: true, path: input.path }
}
