/**
 * 会话历史「还在回灌」判定（luna main-155：重启后选中的会话先闪几秒空态再出历史）。
 * 回灌成功（applySessionHydrate）或新建会话（publishCreatedComposer，本来就没有历史）才记为已回灌；
 * 在那之前、且消息为空、不在跑：渲染层不画空态问候，只留中性的空白占位。
 * 启动 / 切工作区时 loadWorkspace 还在挑前台会话（sessionId 仍为空）也算加载中，不先闪空态。
 * 兜底：同一会话等满 HISTORY_PENDING_MAX_MS 仍没回灌（别的入口没打标），照常显示空态，不卡死。
 */
import { useEffect, useState, useSyncExternalStore } from "react"

export const HISTORY_PENDING_MAX_MS = 8_000

const hydrated = new Set<string>()
const listeners = new Set<() => void>()
let version = 0
let picking = false

function emit(): void {
  version += 1
  for (const listener of listeners) listener()
}

/** loadWorkspace 挑前台会话期间为 true（use-agent-session）。 */
export function setForegroundSessionPicking(on: boolean): void {
  if (picking === on) return
  picking = on
  emit()
}

/** 在 setSession 之前就打好的标记（新建会话发布：本来就没有历史），下一次 setSession 打开它时保留。 */
const markedBeforeOpen = new Set<string>()

export function markSessionHistoryHydrated(
  sessionId: string | null | undefined,
  opts?: { beforeOpen?: boolean }
): void {
  if (!sessionId) return
  if (opts?.beforeOpen) markedBeforeOpen.add(sessionId)
  if (hydrated.has(sessionId)) return
  hydrated.add(sessionId)
  emit()
}

/** 旧标记作废，等这次回灌，不先闪空态。 */
export function forgetSessionHistoryHydrated(sessionId: string | null | undefined): void {
  if (!sessionId || !hydrated.delete(sessionId)) return
  emit()
}

/**
 * chat-store.setSession 换到另一个会话时调用（上一个是别的会话、空首页或创建窗都算）：
 * A→B→A、A→空首页/创建窗→A 都要等这次回灌；只有刚发布、先打过标的新建会话保留标记。
 */
export function noteSessionOpened(sessionId: string): void {
  if (markedBeforeOpen.delete(sessionId)) return
  forgetSessionHistoryHydrated(sessionId)
}

export function isForegroundSessionPicking(): boolean {
  return picking
}

/** 订阅变更（测试与 hook 共用）。 */
export function subscribeSessionHistory(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isSessionHistoryHydrated(sessionId: string): boolean {
  return hydrated.has(sessionId)
}

/** 纯判定，方便 node:test。 */
export function sessionHistoryPending(input: {
  sessionId: string | null
  messageCount: number
  running: boolean
  hydrated: boolean
  timedOut: boolean
  /** 工作区正在挑前台会话（还没有 sessionId）。 */
  picking?: boolean
}): boolean {
  if (input.messageCount > 0 || input.running) return false
  if (!input.sessionId) return Boolean(input.picking) && !input.timedOut
  return !input.hydrated && !input.timedOut
}

export function useSessionHistoryPending(sessionId: string | null, messageCount: number, running: boolean): boolean {
  useSyncExternalStore(subscribeSessionHistory, () => version)
  const isHydrated = sessionId ? hydrated.has(sessionId) : false
  const key = sessionId ?? (picking ? "__picking__" : null)
  const waiting = key !== null && !isHydrated
  const [timedOutFor, setTimedOutFor] = useState<string | null>(null)
  const [prevKey, setPrevKey] = useState(key)
  if (prevKey !== key) {
    // 换了会话（含 A→B→A 切回）：上一轮的超时不算数，重新等。
    setPrevKey(key)
    setTimedOutFor(null)
  }
  useEffect(() => {
    if (!waiting || key === null) return
    const timer = window.setTimeout(() => setTimedOutFor(key), HISTORY_PENDING_MAX_MS)
    return () => window.clearTimeout(timer)
  }, [key, waiting])
  return sessionHistoryPending({
    sessionId,
    messageCount,
    running,
    hydrated: isHydrated,
    timedOut: timedOutFor === key,
    picking
  })
}
