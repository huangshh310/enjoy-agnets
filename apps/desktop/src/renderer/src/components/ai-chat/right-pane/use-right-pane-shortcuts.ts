/**
 * 右栏快捷键：与选项列表上的 hint 对齐，收起时先展开再打开。
 */
import { useEffect } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import type { RightPaneKind } from "./right-pane.types"

export function useRightPaneShortcuts() {
  const setRightPanelCollapsed = useChatStore((state) => state.setRightPanelCollapsed)
  const openTool = useRightPaneStore((state) => state.openTool)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const kind = kindFromEvent(event)
      if (!kind) return
      event.preventDefault()
      setRightPanelCollapsed(false)
      openTool(kind)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openTool, setRightPanelCollapsed])
}

function kindFromEvent(event: KeyboardEvent): RightPaneKind | null {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "g") return "review"
  if (event.ctrlKey && !event.shiftKey && event.key === "`") return "terminal"
  if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === "t") return "browser"
  if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === "p") return "files"
  return null
}
