/**
 * 会话多标签动作：开 / 切 / 关 / 新对话 / 归档摘除。
 * 前台切换一律走 selectPersistedSession / showEmptyHistoryChat，草稿与审批契约不变。
 */
import { showAppToast } from "@renderer/lib/app-toast"
import { readPersistedDraft } from "@renderer/lib/session-draft-storage"
import { useChatStore } from "@renderer/stores/chat-store"
import {
  closeSessionTabInStore,
  removeSessionTabInStore,
  useSessionTabsStore
} from "@renderer/stores/session-tabs-store"
import { selectPersistedSession } from "../session-lifecycle"
import { showEmptyHistoryChat } from "../nav-history/show-empty-chat"
import {
  SESSION_TAB_OVERFLOW_MESSAGE,
  tabCloseNeedsDraftConfirm
} from "./session-tabs-logic"
import { clearComposerAssets } from "../composer-assets"

export async function openSessionInTab(sessionId: string): Promise<boolean> {
  const result = useSessionTabsStore.getState().openInTab(sessionId)
  if (!result.ok) {
    showAppToast(result.message || SESSION_TAB_OVERFLOW_MESSAGE, {
      id: "session-tab-cap",
      testId: "session-tab-cap-toast"
    })
    return false
  }
  await selectPersistedSession(sessionId)
  return true
}

export async function selectSessionTab(sessionId: string): Promise<void> {
  await selectPersistedSession(sessionId)
}

export async function selectSessionFromSidebarClick(
  sessionId: string,
  opts?: { openInTab?: boolean }
): Promise<void> {
  if (opts?.openInTab) {
    await openSessionInTab(sessionId)
    return
  }
  useSessionTabsStore.getState().selectFromSidebar(sessionId)
  await selectPersistedSession(sessionId)
}

export function sessionTabCloseNeedsConfirm(sessionId: string): boolean {
  const store = useChatStore.getState()
  const memory = store.getSessionDraft(sessionId)
  return tabCloseNeedsDraftConfirm({
    sessionId,
    activeId: store.sessionId,
    composer: store.sessionId === sessionId ? store.composer : "",
    memoryDraftText: memory?.text,
    persistedDraftText: readPersistedDraft(sessionId)
  })
}

/** 开始关标签：需确认则挂起；否则立刻关。 */
export async function beginCloseSessionTab(sessionId: string): Promise<"closed" | "confirm"> {
  if (sessionTabCloseNeedsConfirm(sessionId)) {
    useSessionTabsStore.getState().requestCloseTab(sessionId)
    return "confirm"
  }
  await finishCloseSessionTab(sessionId, { discardMemoryDraft: false })
  return "closed"
}

export async function confirmCloseSessionTabDiscard(): Promise<void> {
  const sessionId = useSessionTabsStore.getState().pendingCloseId
  if (!sessionId) return
  await finishCloseSessionTab(sessionId, { discardMemoryDraft: true })
}

export function cancelCloseSessionTab(): void {
  useSessionTabsStore.getState().cancelCloseTab()
}

async function finishCloseSessionTab(
  sessionId: string,
  opts: { discardMemoryDraft: boolean }
): Promise<void> {
  const chat = useChatStore.getState()
  const activeId = chat.sessionId
  if (opts.discardMemoryDraft) {
    discardMemoryDraftForSession(sessionId, activeId)
  }
  const { nextActive } = closeSessionTabInStore(sessionId, activeId)
  useSessionTabsStore.setState({ pendingCloseId: null })
  if (nextActive == null) {
    showEmptyHistoryChat()
    return
  }
  if (nextActive !== activeId) {
    await selectPersistedSession(nextActive)
  }
}

function discardMemoryDraftForSession(sessionId: string, activeId: string | null): void {
  const store = useChatStore.getState()
  store.clearSessionDraft(sessionId)
  if (sessionId === activeId) {
    store.setComposer("")
    clearComposerAssets()
  }
}

/** 归档/删除后摘标签；若前台被摘则切下一枚或空态（调用方仍可自行 land）。 */
export async function syncTabsAfterSessionRemoved(sessionId: string): Promise<string | null> {
  const activeId = useChatStore.getState().sessionId
  const { nextActive, tabIds } = removeSessionTabInStore(sessionId, activeId)
  void tabIds
  return nextActive
}


/**
 * 新对话落进标签集。reusedEmpty：未建新会话、复用了当前空壳。
 */
export function applyNewChatToTabs(input: {
  newSessionId: string
  previousActiveId: string | null
  reusedEmpty: boolean
}): void {
  useSessionTabsStore.getState().applyNewChat({
    newSessionId: input.newSessionId,
    previousActiveId: input.previousActiveId,
    reusedEmpty: input.reusedEmpty,
    emptyNewChatTabId: null
  })
}


export function hydrateSessionTabsForWorkspace(
  workspaceId: string | null,
  foregroundSessionId: string | null
): void {
  useSessionTabsStore.getState().hydrateForWorkspace(workspaceId, foregroundSessionId)
}
