/**
 * Inspector 始终挂在树上：收起走 Panel.collapse，不要 unmount。
 */
import { useEffect } from "react"
import { Panel, Separator, usePanelRef } from "react-resizable-panels"
import { cx } from "@/utils/cx"
import { RightPane } from "@renderer/components/ai-chat/right-pane/right-pane"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"

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

  useEffect(() => {
    if (collapsed) panelRef.current?.collapse()
    else panelRef.current?.expand()
  }, [collapsed, panelRef])

  return (
    <>
      <Separator
        disabled={maximized || collapsed}
        className={cx(
          "relative z-10 shrink-0 bg-transparent outline-none",
          collapsed || maximized
            ? "hidden w-0"
            : "w-3 cursor-col-resize after:absolute after:inset-y-8 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full after:bg-transparent hover:after:bg-border-button-default data-active:after:bg-accent-500"
        )}
      />
      <Panel
        id="changes"
        panelRef={panelRef}
        collapsible
        collapsedSize="0px"
        minSize={collapsed ? "0px" : "280px"}
        defaultSize={collapsed ? "0%" : "38%"}
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
