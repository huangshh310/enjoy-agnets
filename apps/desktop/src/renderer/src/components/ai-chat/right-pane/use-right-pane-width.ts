/**
 * 右栏宽度：加宽审查栏时工作台仍保留 42%，禁止 collapse 到 0。
 */
import { useCallback, useRef, useState } from "react"
import { useGroupRef, usePanelRef } from "react-resizable-panels"
import {
  STAGE_DEFAULT_SIZE,
  STAGE_TINY_PX,
  STAGE_WHEN_INSPECTOR_WIDE
} from "@renderer/components/app-shell/layout/inspector-panel-size"

type StagePanel = {
  expand?: () => void
  resize: (size: string) => void
  isCollapsed?: () => boolean
  getSize?: () => { inPixels: number }
}

export function useRightPaneWidth() {
  const groupRef = useGroupRef()
  const chatPanelRef = usePanelRef()
  const [maximized, setMaximized] = useState(false)
  const maximizedRef = useRef(maximized)
  maximizedRef.current = maximized

  const restoreStage = useCallback(() => {
    const panel = chatPanelRef.current as StagePanel | null
    if (!panel) return
    const collapsed = Boolean(panel.isCollapsed?.())
    let tiny = false
    try {
      tiny = (panel.getSize?.().inPixels ?? 999) < STAGE_TINY_PX
    } catch {
      tiny = false
    }
    if (!maximizedRef.current && !collapsed && !tiny) return
    resizeStage(panel, STAGE_DEFAULT_SIZE)
    setMaximized(false)
  }, [chatPanelRef])

  const toggleWidth = useCallback(() => {
    const panel = chatPanelRef.current as StagePanel | null
    if (!panel) return
    if (maximized) {
      restoreStage()
      return
    }
    resizeStage(panel, STAGE_WHEN_INSPECTOR_WIDE)
    setMaximized(true)
  }, [chatPanelRef, maximized, restoreStage])

  const resetWidth = useCallback(() => {
    if (maximized) restoreStage()
    else setMaximized(false)
  }, [maximized, restoreStage])

  return { groupRef, chatPanelRef, maximized, toggleWidth, resetWidth, restoreStage }
}

function resizeStage(panel: StagePanel, size: string) {
  try {
    panel.expand?.()
  } catch {
    // 工作台不再 collapsible 时 expand 可能抛
  }
  try {
    panel.resize(size)
  } catch {
    // Group 尚未注册
  }
}
