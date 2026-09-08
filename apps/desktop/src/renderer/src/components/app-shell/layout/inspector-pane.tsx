/**
 * Inspector 始终挂在树上：收起走 Panel.collapse，不要 unmount。
 */
import { useEffect } from "react"
import { Panel, Separator, usePanelRef } from "react-resizable-panels"
import { cx } from "@/utils/cx"
import { RightPane } from "@renderer/components/ai-chat/right-pane/right-pane"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import {
  INSPECTOR_DEFAULT_SIZE,
  INSPECTOR_MIN_PX,
  needsInspectorDefaultSize
} from "./inspector-panel-size"

type InspectorPanelHandle = {
  collapse: () => void
  expand: () => void
  resize: (size: string) => void
  getSize: () => { inPixels: number }
}

function applyInspectorCollapsed(panel: InspectorPanelHandle, collapsed: boolean) {
  if (collapsed) {
    panel.collapse()
    return
  }
  panel.expand()
  if (needsInspectorDefaultSize(panel.getSize().inPixels)) {
    panel.resize(INSPECTOR_DEFAULT_SIZE)
  }
}

export function InspectorPane({
  maximized,
  toggleWidth,
  resetWidth
}: {
  maximized: boolean
  toggleWidth: () => void
  resetWidth: () => void
}) {
  const collapsed = useChatStore((state) => state.rightPanelCollapsed)
  const setCollapsed = useChatStore((state) => state.setRightPanelCollapsed)
  const panelRef = usePanelRef()

  // 必须用 useEffect：useLayoutEffect 会在 Group 注册前调用 expand/collapse，
  // 抛出 Group enjoy-agents-chat-split not found。
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    try {
      applyInspectorCollapsed(panel, collapsed)
      return
    } catch {
      const frame = requestAnimationFrame(() => {
        const next = panelRef.current
        if (!next) return
        try {
          applyInspectorCollapsed(next, collapsed)
        } catch {
          // Group 仍未就绪；下次 collapsed 变化再试
        }
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [collapsed, panelRef])

  return (
    <>
      <Separator
        disabled={collapsed}
        className={cx(
          "relative z-10 shrink-0 bg-transparent outline-none",
          collapsed
            ? "hidden w-0"
            : "w-3 cursor-col-resize after:absolute after:inset-y-8 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full after:bg-transparent hover:after:bg-border-button-default data-active:after:bg-accent-500"
        )}
      />
      <Panel
        id="changes"
        panelRef={panelRef}
        collapsible
        collapsedSize="0px"
        minSize={`${INSPECTOR_MIN_PX}px`}
        defaultSize={INSPECTOR_DEFAULT_SIZE}
        className="min-h-0 bg-transparent"
      >
        <InspectorBody
          maximized={maximized}
          toggleWidth={toggleWidth}
          resetWidth={resetWidth}
          onCollapsed={() => setCollapsed(true)}
        />
      </Panel>
    </>
  )
}

function InspectorBody({
  maximized,
  toggleWidth,
  resetWidth,
  onCollapsed
}: {
  maximized: boolean
  toggleWidth: () => void
  resetWidth: () => void
  onCollapsed: () => void
}) {
  const workspaceId = useChatStore((state) => state.workspaceId)
  const changes = useChatStore((state) => state.changes)
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)
  const selectedFilePath = useChatStore((state) => state.selectedFilePath)
  const selectedFileContent = useChatStore((state) => state.selectedFileContent)
  return (
    <RightPane
      workspaceId={workspaceId}
      changes={changes}
      additions={additions}
      deletions={deletions}
      selectedFilePath={selectedFilePath}
      selectedFileContent={selectedFileContent}
      onSelectFile={(path) => void openChangedFile(path)}
      onCollapse={() => {
        resetWidth()
        onCollapsed()
      }}
      maximized={maximized}
      onToggleWidth={toggleWidth}
    />
  )
}
