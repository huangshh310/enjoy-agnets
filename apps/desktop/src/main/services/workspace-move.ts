/**
 * 用户把 Files 树条目拖进目录：查工作区后 jail + rename，不走 HMAC。
 */
import { getWorkspace } from "./workspace"
import { renameInsideWorkspace } from "./workspace-rename"

export { MOVE_EXISTS, MOVE_NOT_FOUND, renameInsideWorkspace } from "./workspace-rename"

export async function moveWorkspacePath(input: {
  workspaceId: string
  from: string
  toDir: string
}): Promise<{ ok: true; from: string; to: string }> {
  const workspace = await getWorkspace(input.workspaceId)
  return renameInsideWorkspace(workspace.rootPath, input.from, input.toDir)
}
