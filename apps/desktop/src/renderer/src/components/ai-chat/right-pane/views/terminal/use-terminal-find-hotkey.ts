/**
 * 终端聚焦时 ⌘/Ctrl+F 打开查找；Esc 先关查找，并拦住 Chromium 页内查找。
 */
import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react"
import { isTerminalFindHotkey, isTerminalKeyTarget } from "./terminal-focus"

export function useTerminalFindHotkey(
  paneRef: RefObject<HTMLElement | null>,
  findOpen: boolean,
  setFindOpen: Dispatch<SetStateAction<boolean>>,
  setQuery: Dispatch<SetStateAction<string>>
): void {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && findOpen && isTerminalKeyTarget(event.target as Element | null)) {
        event.preventDefault()
        event.stopPropagation()
        setFindOpen(false)
        setQuery("")
        return
      }
      if (!isTerminalFindHotkey(event)) return
      if (!isTerminalKeyTarget(document.activeElement)) return
      const pane = paneRef.current
      if (!pane?.contains(document.activeElement)) return
      event.preventDefault()
      event.stopPropagation()
      setFindOpen(true)
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [findOpen, paneRef, setFindOpen, setQuery])
}
