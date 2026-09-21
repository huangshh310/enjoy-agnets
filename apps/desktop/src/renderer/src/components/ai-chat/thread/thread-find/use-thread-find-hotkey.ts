/**
 * Chat 工作台 ⌘/Ctrl+F 打开本会话查找；Esc 先关查找。
 */
import { useEffect, useSyncExternalStore } from "react"
import { isThreadFindOpen, setThreadFindOpen, subscribeThreadFind } from "./thread-find-store"

export function useThreadFindHotkey() {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!chatStageVisible()) return
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === "f") {
        event.preventDefault()
        setThreadFindOpen(true)
        return
      }
      if (event.key === "Escape" && isThreadFindOpen()) {
        event.preventDefault()
        event.stopPropagation()
        setThreadFindOpen(false)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [])
}

export function useThreadFindOpen(): boolean {
  return useSyncExternalStore(subscribeThreadFind, isThreadFindOpen, isThreadFindOpen)
}

function chatStageVisible(): boolean {
  const node = document.querySelector("[data-chat-stage][data-chat-surface='thread']")
  if (!(node instanceof HTMLElement)) return false
  return node.getClientRects().length > 0
}
