/**
 * 右栏宽度：展开时占满主区（会话栏收到 0），再点恢复展开前的分栏。
 */
import { useState } from "react"
import { useGroupRef, usePanelRef } from "react-resizable-panels"

export function useRightPaneWidth() {
  const groupRef = useGroupRef()
  const chatPanelRef = usePanelRef()
  const [maximized, setMaximized] = useState(false)

  function toggleWidth() {
    const panel = chatPanelRef.current
    if (!panel) return
    if (maximized) {
      panel.expand()
      setMaximized(false)
      return
    }
    panel.collapse()
    setMaximized(true)
  }

  /** 整栏收起前先把会话栏展开，避免主区被收成 0 宽。 */
  function resetWidth() {
    if (maximized) {
      chatPanelRef.current?.expand()
    }
    setMaximized(false)
  }

  return { groupRef, chatPanelRef, maximized, toggleWidth, resetWidth }
}
