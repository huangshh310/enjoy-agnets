/**
 * 把观察和按钮收成一次跳转。恢复进行中时，用户的新打开会作废这次恢复。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { applyHistoryEntry } from "./apply-entry"
import { DEFAULT_HISTORY_ID } from "./constants"
import { historyPathname } from "./derive-entry"
import {
  beginHistoryApply,
  endHistoryApply,
  isApplyCurrent,
  isHistorySuppressed,
  noteExternalNavigation
} from "./nav-history-gate"
import { useNavHistoryStore } from "./nav-history-store"
import type { HistoryEntry, HistorySide } from "./nav-history.types"

let pending: HistoryEntry | null = null
let landingId: string | null = null

export function syncObservedEntry(entry: HistoryEntry): void {
  if (isHistorySuppressed()) {
    pending = entry
    return
  }
  useNavHistoryStore.getState().record(entry, Date.now())
}

export async function travelHistory(direction: "back" | "forward"): Promise<void> {
  const moved = direction === "back"
    ? useNavHistoryStore.getState().back()
    : useNavHistoryStore.getState().forward()
  if (!moved) return
  await showCurrent()
}

export async function jumpHistoryTo(side: HistorySide, recentIndex: number): Promise<void> {
  const moved = useNavHistoryStore.getState().jump(side, recentIndex)
  if (!moved) return
  await showCurrent()
}

/** 删光项目后回到主区空态，不要停在设置等路由页。 */
export async function landEmptyHome(): Promise<void> {
  await showHistoryEntry(defaultEntry())
}

/** 页面被删。当前页被删时落到 past 末尾，没有则开新聊天。 */
export async function releaseHistoryPages(ids: readonly string[]): Promise<boolean> {
  const removed = useNavHistoryStore.getState().forget(ids, defaultEntry())
  if (!removed) return false
  await showCurrent()
  return true
}

/** 删除项目：剪掉该项目的历史条目，不弹栈、不导航。 */
export function pruneHistoryPages(ids: readonly string[]): void {
  useNavHistoryStore.getState().prune(ids, defaultEntry())
}

async function showCurrent(): Promise<void> {
  await showHistoryEntry(useNavHistoryStore.getState().current)
}

async function showHistoryEntry(entry: HistoryEntry): Promise<void> {
  const my = beginHistoryApply()
  if (isLanding(entry)) landingId = entry.id
  const stop = await watchDivergence(entry, my)
  let depth = 0
  try {
    await applyHistoryEntry(entry, () => !isApplyCurrent(my))
  } finally {
    stop()
    depth = endHistoryApply()
  }
  if (depth > 0) return
  const observed = pending
  pending = null
  if (!observed) return
  if (!isApplyCurrent(my)) {
    landingId = null
    useNavHistoryStore.getState().record(observed, Date.now())
    return
  }
  commitLanding(observed)
}

function commitLanding(entry: HistoryEntry): void {
  const fromId = landingId
  landingId = null
  const store = useNavHistoryStore.getState()
  if (fromId && entry.id !== fromId) {
    store.retarget(fromId, entry)
    return
  }
  store.record(entry, Date.now())
}

function isLanding(entry: HistoryEntry): boolean {
  return entry.id === DEFAULT_HISTORY_ID || entry.params?.kind === "workspace"
}

function defaultEntry(): HistoryEntry {
  return { id: DEFAULT_HISTORY_ID, title: "新对话", params: { kind: "route", to: "/" } }
}

async function watchDivergence(entry: HistoryEntry, my: number): Promise<() => void> {
  const targetPath = historyPathname(entry)
  const { router } = await import("@renderer/router")
  const unsubRoute = router.history.subscribe(() => {
    if (!isApplyCurrent(my)) return
    if (router.state.location.pathname === targetPath) return
    noteExternalNavigation()
  })
  const unsubSession = useChatStore.subscribe((state, prev) => {
    if (!isApplyCurrent(my)) return
    if (state.sessionId === prev.sessionId) return
    if (isLanding(entry)) return
    if (entry.params?.kind === "session" && state.sessionId === entry.params.sessionId) return
    noteExternalNavigation()
  })
  return () => {
    unsubRoute()
    unsubSession()
  }
}
