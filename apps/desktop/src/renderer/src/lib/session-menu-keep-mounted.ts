/**
 * 行菜单打开期间：把该 sessionId 对应 virtua index 列入 keepMounted，
 * 避免回收后触发器 bbox 丢失导致 portal 锚漂。
 */
type Listener = () => void

let openSessionId: string | null = null
const listeners = new Set<Listener>()

export function getOpenSessionMenuId(): string | null {
  return openSessionId
}

export function setOpenSessionMenuId(sessionId: string | null): void {
  if (openSessionId === sessionId) return
  openSessionId = sessionId
  for (const listener of listeners) listener()
}

export function subscribeOpenSessionMenu(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
