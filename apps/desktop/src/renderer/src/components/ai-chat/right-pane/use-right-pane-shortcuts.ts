/**
 * 右栏快捷键：与选项列表上的 hint 对齐，收起时先展开再打开。
 */
import { useEffect } from "react"
import { revealRightPane } from "./open-pane"
import type { RightPaneKind } from "./right-pane.types"

export function useRightPaneShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const kind = kindFromEvent(event)
      if (!kind) return
      event.preventDefault()
      revealRightPane(kind)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}

function kindFromEvent(event: KeyboardEvent): RightPaneKind | null {
  const mod = event.metaKey || event.ctrlKey
  if (!mod) return null
  if (event.shiftKey && event.key.toLowerCase() === "c") return "context"
  if (event.shiftKey && event.key.toLowerCase() === "g") return "review"
  if (!event.shiftKey && event.key === "`") return "terminal"
  if (!event.shiftKey && event.key.toLowerCase() === "t") return "browser"
  if (!event.shiftKey && event.key.toLowerCase() === "p") return "files"
  return null
}
