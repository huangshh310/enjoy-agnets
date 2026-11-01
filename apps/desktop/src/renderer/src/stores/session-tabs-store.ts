/**
 * 会话级多标签工作集（renderer 本地）。侧栏/DB 仍是会话真源。
 * 按工作区落 localStorage，重启后还在。
 */
import { create } from "zustand"
import {
  closeSessionTab,
  openSessionTab,
  planNewChatIntoTabs,
  removeSessionFromTabs,
  seedTabIfEmpty,
  selectSessionFromSidebar,
  type OpenSessionTabResult
} from "@renderer/hooks/session-tabs/session-tabs-logic"

const STORAGE_PREFIX = "enjoy.sessionTabs."

type SessionTabsStore = {
  workspaceId: string | null
  tabIds: string[]
  /** 关标签待确认（仅内存草稿） */
  pendingCloseId: string | null
  hydrateForWorkspace: (workspaceId: string | null, foregroundSessionId: string | null) => void
  openInTab: (sessionId: string) => OpenSessionTabResult
  selectFromSidebar: (sessionId: string) => { focusId: string; added: boolean }
  requestCloseTab: (sessionId: string) => "closed" | "confirm"
  confirmCloseTab: (discardDraft: boolean) => { nextActive: string | null } | null
  cancelCloseTab: () => void
  closeTabNow: (sessionId: string) => { nextActive: string | null }
  removeSession: (sessionId: string) => { nextActive: string | null }
  applyNewChat: (input: {
    newSessionId: string
    previousActiveId: string | null
    reusedEmpty: boolean
    emptyNewChatTabId: string | null
  }) => void
  resetForTests: () => void
}

function storageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}${workspaceId}`
}

function readPersisted(workspaceId: string): string[] {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0)
  } catch {
    return []
  }
}

function writePersisted(workspaceId: string | null, tabIds: string[]): void {
  if (!workspaceId || typeof localStorage === "undefined") return
  try {
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(tabIds))
  } catch {
    // 配额满：只丢落盘
  }
}

function setTabs(
  set: (partial: Partial<SessionTabsStore>) => void,
  get: () => SessionTabsStore,
  tabIds: string[]
): void {
  set({ tabIds })
  writePersisted(get().workspaceId, tabIds)
}

export const useSessionTabsStore = create<SessionTabsStore>((set, get) => ({
  workspaceId: null,
  tabIds: [],
  pendingCloseId: null,

  hydrateForWorkspace: (workspaceId, foregroundSessionId) => {
    if (!workspaceId) {
      set({ workspaceId: null, tabIds: [], pendingCloseId: null })
      return
    }
    const loaded = readPersisted(workspaceId)
    const tabIds = seedTabIfEmpty(loaded, foregroundSessionId)
    set({ workspaceId, tabIds, pendingCloseId: null })
    writePersisted(workspaceId, tabIds)
  },

  openInTab: (sessionId) => {
    const result = openSessionTab({ tabIds: get().tabIds }, sessionId)
    if (result.ok) setTabs(set, get, result.tabIds)
    return result
  },

  selectFromSidebar: (sessionId) => {
    const result = selectSessionFromSidebar({ tabIds: get().tabIds }, sessionId)
    setTabs(set, get, result.tabIds)
    return { focusId: result.focusId, added: result.added }
  },

  requestCloseTab: (sessionId) => {
    // 草稿确认由调用方根据 tabCloseNeedsDraftConfirm 决定；此处直接关或挂起由 actions 层处理。
    set({ pendingCloseId: sessionId })
    return "confirm"
  },

  confirmCloseTab: (discardDraft) => {
    const sessionId = get().pendingCloseId
    if (!sessionId) return null
    set({ pendingCloseId: null })
    if (!discardDraft) return null
    return get().closeTabNow(sessionId)
  },

  cancelCloseTab: () => set({ pendingCloseId: null }),

  closeTabNow: (sessionId) => {
    const activeId = null // 调用方传入前台后处理；此处只改工作集，nextActive 用 closeSessionTab 时需要 active
    // 实际 nextActive 由 actions 传入 activeId 计算——见 closeTabWithActive
    const result = closeSessionTab({ tabIds: get().tabIds }, sessionId, activeId)
    setTabs(set, get, result.tabIds)
    return { nextActive: result.nextActive }
  },

  removeSession: (sessionId) => {
    const result = removeSessionFromTabs({ tabIds: get().tabIds }, sessionId, null)
    setTabs(set, get, result.tabIds)
    return { nextActive: result.nextActive }
  },

  applyNewChat: (input) => {
    const planned = planNewChatIntoTabs({
      tabIds: get().tabIds,
      activeId: input.previousActiveId,
      newSessionId: input.newSessionId,
      reusedEmpty: input.reusedEmpty,
      emptyNewChatTabId: input.emptyNewChatTabId
    })
    setTabs(set, get, planned.tabIds)
  },

  resetForTests: () => set({ workspaceId: null, tabIds: [], pendingCloseId: null })
}))

/** 带前台 id 关标签（store.closeTabNow 的完整版）。 */
export function closeSessionTabInStore(
  sessionId: string,
  activeId: string | null
): { tabIds: string[]; nextActive: string | null } {
  const state = useSessionTabsStore.getState()
  const result = closeSessionTab({ tabIds: state.tabIds }, sessionId, activeId)
  useSessionTabsStore.setState({ tabIds: result.tabIds, pendingCloseId: null })
  writePersisted(state.workspaceId, result.tabIds)
  return result
}

export function removeSessionTabInStore(
  sessionId: string,
  activeId: string | null
): { tabIds: string[]; nextActive: string | null } {
  const state = useSessionTabsStore.getState()
  const result = removeSessionFromTabs({ tabIds: state.tabIds }, sessionId, activeId)
  useSessionTabsStore.setState({ tabIds: result.tabIds })
  writePersisted(state.workspaceId, result.tabIds)
  return result
}
