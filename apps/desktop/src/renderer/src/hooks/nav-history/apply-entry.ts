/**
 * 把历史条目落到路由和会话上。调用方负责取消过期的恢复。
 */
import { connectSshIfNeeded, disconnectPreviousSsh } from "@renderer/hooks/ssh-session-switch"
import { loadSession, selectPersistedSession } from "@renderer/hooks/session-lifecycle"
import { dropDanglingWorkspacePointer } from "@renderer/hooks/workspace-pointer"
import { workspaceRowFromNode } from "@renderer/hooks/workspace-row"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { DEFAULT_HISTORY_ID } from "./constants"
import type { HistoryEntry } from "./nav-history.types"
import { showEmptyHistoryChat } from "./show-empty-chat"
import { loadHistoryRouter } from "./history-router"

type Stale = () => boolean

export async function applyHistoryEntry(entry: HistoryEntry, stale: Stale): Promise<void> {
  if (stale()) return
  const params = entry.params
  if (params?.kind === "session" && params.sessionId) {
    await applySession(entry.id, params.sessionId, params.workspaceId, entry.title, stale)
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

async function applySession(
  entryId: string,
  sessionId: string,
  workspaceId: string | undefined,
  title: string,
  stale: Stale
) {
  // jojo P1（#136 r6）：历史里的会话已被删（离开时丢弃的空「新对话」、导入后被删的会话等）——
  // 不能顶着它的标题落到一个不存在的会话上（发送必失败、重试也失败）。把这条从历史里去掉，落到它前一页，前面没有就回空首页。
  if (!(await sessionStillExists(sessionId, workspaceId))) {
    if (stale()) return
    const { releaseHistoryPages } = await import("./nav-history-controller")
    await releaseHistoryPages([entryId])
    return
  }
  // leo r6 BLOCK：不能抢先 setSession。loadSession 靠「当前会话 ≠ 目标」判定离开：停车上一会话的轮、存它的稿、
  // 还目标会话的稿和停车态。抢先改了 sessionId 会被当成同一会话，上一会话的 running / runId / 输入框原样留在这里。
  if (stale()) return
  await navigateTo("/", undefined, undefined, stale)
  if (stale()) return
  const opened = await selectPersistedSession(sessionId, workspaceId, stale)
  if (opened || stale()) return
  await loadSession(sessionId, title, stale)
}

/** 以 main 的会话列表为准（侧栏缓存可能还留着刚删的行）；问不到就按侧栏，侧栏也没有才算没了。 */
async function sessionStillExists(sessionId: string, workspaceId: string | undefined): Promise<boolean> {
  const listed = useChatStore
    .getState()
    .repositories.some((node) => node.id === sessionId && node.kind === "session")
  if (!workspaceId || !hasIde()) return listed
  try {
    const sessions = (await getIde().session.list({ workspaceId })) as Array<{ id: string }>
    return sessions.some((row) => row.id === sessionId)
  } catch {
    return listed
  }
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
  showEmptyHistoryChat()
  dropDanglingWorkspacePointer()
}

async function navigateEntry(entry: HistoryEntry, stale: Stale) {
  const params = entry.params
  await navigateTo(params?.to ?? "/", params?.params, params?.search, stale)
  if (stale()) return
  dropDanglingWorkspacePointer()
}

async function navigateTo(
  to: string,
  params: Record<string, string> | undefined,
  search: Record<string, string> | undefined,
  stale: Stale
) {
  if (stale()) return
  const router = await loadHistoryRouter()
  if (stale()) return
  await router.navigate({
    to: to as "/",
    params: params as never,
    search: (search ?? {}) as never
  })
}
