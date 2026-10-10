/**
 * 启动时用 settings.lastWorkspaceId 对齐当前工作区。
 * 只在还没有当前工作区时发生；有指针就不动，避免用过期名单推断「有没有项目」。
 */
import { useChatStore } from "../stores/chat-store"
import type { WorkspaceRow } from "./workspace-row"

export type BootWorkspacePlan =
  | { action: "clear" }
  | { action: "noop" }
  | { action: "load"; workspace: WorkspaceRow }

export function planBootWorkspace(input: {
  workspaces: readonly WorkspaceRow[]
  lastWorkspaceId: string | null | undefined
  recentWorkspaceIds?: readonly string[]
  currentWorkspaceId: string | null
}): BootWorkspacePlan {
  if (input.currentWorkspaceId) return { action: "noop" }
  if (input.workspaces.length === 0) return { action: "clear" }
  const byId = new Map(input.workspaces.map((row) => [row.id, row]))
  const selected =
    byId.get(input.lastWorkspaceId ?? "") ??
    (input.recentWorkspaceIds ?? []).map((id) => byId.get(id)).find(Boolean) ??
    input.workspaces[0]
  return { action: "load", workspace: selected }
}

/** useAgentSession 启动对齐的生产入口。 */
export function syncBootWorkspace(
  workspaces: readonly WorkspaceRow[] | undefined,
  lastWorkspaceId: string | null | undefined,
  load: (workspace: WorkspaceRow) => void,
  recentWorkspaceIds?: readonly string[]
) {
  if (!workspaces) return
  const store = useChatStore.getState()
  const plan = planBootWorkspace({
    workspaces,
    lastWorkspaceId,
    recentWorkspaceIds,
    currentWorkspaceId: store.workspaceId
  })
  if (plan.action === "clear") store.setWorkspace(null)
  if (plan.action === "load") load(plan.workspace)
}
