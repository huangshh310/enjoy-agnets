/**
 * 本会话查找开关。Chat 工作台 ⌘F 打开，Esc 关掉。
 */
let open = false
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function isThreadFindOpen(): boolean {
  return open
}

export function setThreadFindOpen(next: boolean): void {
  if (open === next) return
  open = next
  notify()
}

export function subscribeThreadFind(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
