/**
 * 把历史条目落到路由和会话上。调用方负责取消过期的恢复。
 */
import { connectSshIfNeeded, disconnectPreviousSsh } from "@renderer/hooks/ssh-session-switch"
import { loadSession, selectPersistedSession } from "@renderer/hooks/session-lifecycle"
import { workspaceRowFromNode } from "@renderer/hooks/workspace-row"
import { useChatStore } from "@renderer/stores/chat-store"
import { DEFAULT_HISTORY_ID } from "./constants"
import type { HistoryEntry } from "./nav-history.types"
import { showEmptyHistoryChat } from "./show-empty-chat"

type Stale = () => boolean

export async function applyHistoryEntry(entry: HistoryEntry, stale: Stale): Promise<void> {
  if (stale()) return
  const params = entry.params
  if (params?.kind === "session" && params.sessionId) {
    await applySession(params.sessionId, params.workspaceId, entry.title, stale)
    return
  }
  if (params?.kind === "workspace" && params.workspaceId) {
    await applyWorkspace(params.workspaceId, stale)
    return
  }
  if (entry.id === DEFAULT_HISTORY_ID) {
    await applyDefault(stale)
    return
  }
  await navigateEntry(entry, stale)
}

async function applySession(sessionId: string, workspaceId: string | undefined, title: string, stale: Stale) {
  useChatStore.getState().setSession(sessionId, title)
  if (stale()) return
  await navigateTo("/", undefined, undefined, stale)
  if (stale()) return
  const opened = await selectPersistedSession(sessionId, workspaceId, stale)
  if (opened || stale()) return
  await loadSession(sessionId, title, stale)
}

async function applyWorkspace(workspaceId: string, stale: Stale) {
  const node = useChatStore.getState().repositories.find((item) => item.id === workspaceId && item.kind === "workspace")
  await navigateTo("/", undefined, undefined, stale)
  if (!node || stale()) return
  await openWorkspaceHome(workspaceRowFromNode(node), stale)
  if (stale()) return
  showEmptyHistoryChat()
}

async function openWorkspaceHome(row: ReturnType<typeof workspaceRowFromNode>, stale: Stale) {
  const store = useChatStore.getState()
  if (store.workspaceId === row.id) return
  await disconnectPreviousSsh(store.workspaceId, store.workspaceKind, row.id)
  if (stale()) return
  store.setWorkspace(row)
  await connectSshIfNeeded(row)
}

async function applyDefault(stale: Stale) {
  await navigateTo("/", undefined, undefined, stale)
  if (stale()) return
  const store = useChatStore.getState()
  const alive = store.repositories.some((node) => node.id === store.workspaceId && node.kind === "workspace")
  showEmptyHistoryChat()
  if (store.workspaceId && !alive) clearDanglingWorkspace()
}

async function navigateEntry(entry: HistoryEntry, stale: Stale) {
  const params = entry.params
  await navigateTo(params?.to ?? "/", params?.params, params?.search, stale)
}

async function navigateTo(
  to: string,
  params: Record<string, string> | undefined,
  search: Record<string, string> | undefined,
  stale: Stale
) {
  if (stale()) return
  const { router } = await import("@renderer/router")
  if (stale()) return
  await router.navigate({
    to: to as "/",
    params: params as never,
    search: (search ?? {}) as never
  })
}

/** 项目已从侧栏消失时只清当前工作区指针，别把其它项目列表一起抹掉。 */
function clearDanglingWorkspace() {
  useChatStore.setState({
    workspaceId: null,
    workspaceName: "No workspace",
    workspaceRootLabel: "open a folder",
    workspaceRootPath: null,
    workspaceKind: "local",
    remoteStatus: null,
    remoteLabel: null,
    remoteError: null
  })
}
