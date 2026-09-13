/**
 * 切换工作区时 SSH 连接：切走先 disconnect，目标是 ssh 再 connect。
 */
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import type { WorkspaceRow } from "./workspace-row"

export async function disconnectPreviousSsh(
  previousId: string | null,
  previousKind: "local" | "ssh",
  nextId: string
) {
  if (!hasIde() || previousKind !== "ssh" || !previousId || previousId === nextId) return
  try {
    await getIde().workspace.disconnect({ workspaceId: previousId })
  } catch {
    // 切走仍继续加载目标工作区
  }
}

export async function connectSshIfNeeded(workspace: WorkspaceRow) {
  if (!hasIde() || workspace.kind !== "ssh") return
  try {
    const live = (await getIde().workspace.connect({ workspaceId: workspace.id })) as WorkspaceRow
    useChatStore.getState().setWorkspace({ ...workspace, ...live, kind: "ssh" })
  } catch {
    // 连接失败留下工作区，顶条可重试
  }
}
