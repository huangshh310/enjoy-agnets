/**
 * 当前工作区指针：启动对齐、删除收口、路由回落后的悬空清理。
 * 不引用 ipc-contract，方便 node:test 走真实 chat-store。
 */
import { useChatStore } from "../stores/chat-store"
import type { WorkspaceRow } from "./workspace-row"

/** 只清指针，不抹掉侧栏其它项目。 */
export const EMPTY_WORKSPACE_POINTER = {
  workspaceId: null,
  workspaceName: "No workspace",
  workspaceRootLabel: "open a folder",
  workspaceRootPath: null,
  workspaceKind: "local" as const,
  remoteStatus: null,
  remoteLabel: null,
  remoteError: null
}

export type WorkspacePointerPeek = {
  workspaceId: string | null
  workspaceName: string
  workspaceRootPath: string | null
  sessionId: string | null
}

/** 测试播种：先写指针，再补侧栏节点（setWorkspace(null) 会清空 repositories）。 */
export function seedWorkspacePointer(input: {
  workspace?: WorkspaceRow | null
  repositories?: Array<{ id: string; name?: string; rootPath?: string }>
}) {
  const store = useChatStore.getState()
  if (input.workspace === null) store.setWorkspace(null)
  else if (input.workspace) store.setWorkspace(input.workspace)
  if (!input.repositories) return
  useChatStore.setState({
    repositories: input.repositories.map((row) => ({
      id: row.id,
      name: row.name ?? row.id,
      kind: "workspace" as const,
      updatedAt: 0,
      rootPath: row.rootPath
    }))
  })
}

export function peekWorkspacePointer(): WorkspacePointerPeek {
  const store = useChatStore.getState()
  return {
    workspaceId: store.workspaceId,
    workspaceName: store.workspaceName,
    workspaceRootPath: store.workspaceRootPath,
    sessionId: store.sessionId
  }
}

/** 排除刚删的之后：先 lastWorkspaceId，没有再名单第一个。 */
export function pickWorkspaceAfterRemove(
  remaining: readonly WorkspaceRow[],
  lastWorkspaceId?: string | null
) {
  return remaining.find((row) => row.id === lastWorkspaceId) ?? remaining[0] ?? null
}

/** 删除后按剩余名单收口：当前已在名单里则不动，否则切到上次用过的或第一个，没有则清空。 */
export function settleWorkspaceAfterRemove(
  remaining: readonly WorkspaceRow[],
  lastWorkspaceId?: string | null
) {
  const store = useChatStore.getState()
  if (store.workspaceId && remaining.some((row) => row.id === store.workspaceId)) return null
  const next = pickWorkspaceAfterRemove(remaining, lastWorkspaceId)
  store.setWorkspace(next)
  return next
}

/** 历史落到路由页时，当前 id 已不在侧栏则丢掉悬空指针。 */
export function dropDanglingWorkspacePointer() {
  const store = useChatStore.getState()
  const alive = store.repositories.some(
    (node) => node.id === store.workspaceId && node.kind === "workspace"
  )
  if (store.workspaceId && !alive) useChatStore.setState(EMPTY_WORKSPACE_POINTER)
}
