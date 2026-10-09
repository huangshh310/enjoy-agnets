/**
 * 启动时用 settings.lastWorkspaceId 对齐当前工作区。
 * 创建项目会先写 SQLite 和 store，workspaces query 可能还是旧名单；
 * 旧空快照不得把刚出现的项目从侧栏抹掉。
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
  currentWorkspaceId: string | null
  hasLiveWorkspace: boolean
}): BootWorkspacePlan {
  if (input.workspaces.length === 0) {
    return input.hasLiveWorkspace ? { action: "noop" } : { action: "clear" }
  }
  if (input.currentWorkspaceId) return { action: "noop" }
  const selected =
    input.workspaces.find((row) => row.id === input.lastWorkspaceId) ?? input.workspaces[0]
  return { action: "load", workspace: selected }
}

/** useAgentSession 启动对齐的生产入口。 */
export function syncBootWorkspace(
  workspaces: readonly WorkspaceRow[] | undefined,
  lastWorkspaceId: string | null | undefined,
  load: (workspace: WorkspaceRow) => void
) {
  if (!workspaces) return
  const store = useChatStore.getState()
  const plan = planBootWorkspace({
    workspaces,
    lastWorkspaceId,
    currentWorkspaceId: store.workspaceId,
    hasLiveWorkspace:
      Boolean(store.workspaceId) || store.repositories.some((node) => node.kind === "workspace")
  })
  if (plan.action === "clear") store.setWorkspace(null)
  if (plan.action === "load") load(plan.workspace)
}
