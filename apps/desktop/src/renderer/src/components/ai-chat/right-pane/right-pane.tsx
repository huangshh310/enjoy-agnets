/**
 * 右栏外壳：空态选工具，打开后用标签切换审查 / 终端 / 浏览器 / 文件。
 */
import { useEffect, useRef } from "react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { RiContractRightLine } from "@remixicon/react"
import { PaneWidthToggle } from "./pane-width-toggle"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { RightPaneChrome } from "./pane-chrome"
import { RightPanePicker } from "./picker-list"
import { RightPaneTabBody } from "./right-pane-body"
import { useT } from "@renderer/i18n"

export function RightPane({
  workspaceId,
  changes,
  additions,
  deletions,
  selectedFilePath,
  selectedFileContent,
  onSelectFile,
  onCollapse,
  maximized,
  onToggleWidth
}: {
  workspaceId: string | null
  changes: ChangedFileRow[]
  additions: number
  deletions: number
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
  onCollapse: () => void
  maximized: boolean
  onToggleWidth: () => void
}) {
  const t = useT()
  const tabs = useRightPaneStore((state) => state.tabs)
  const activeId = useRightPaneStore((state) => state.activeId)
  const openTool = useRightPaneStore((state) => state.openTool)
  const closeTab = useRightPaneStore((state) => state.closeTab)
  const setActiveId = useRightPaneStore((state) => state.setActiveId)
  const reset = useRightPaneStore((state) => state.reset)

  const lastWorkspaceId = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (lastWorkspaceId.current === undefined) {
      lastWorkspaceId.current = workspaceId
      return
    }
    if (lastWorkspaceId.current !== workspaceId) {
      lastWorkspaceId.current = workspaceId
      reset()
    }
  }, [workspaceId, reset])

  const empty = tabs.length === 0

  return (
    <section
      data-frost="shell"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl bg-background-primary-default shadow-card"
    >
      {empty ? (
        <div className="flex h-11 shrink-0 items-center justify-end gap-0.5 px-3">
          <PaneWidthToggle maximized={maximized} onToggle={onToggleWidth} />
          <QuietIconButton icon={RiContractRightLine} aria-label={t("chat.collapsePane")} onClick={onCollapse} />
        </div>
      ) : (
        <RightPaneChrome
          tabs={tabs}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={closeTab}
          onAdd={(kind) => openTool(kind, { forceNew: true })}
          onCollapse={onCollapse}
          maximized={maximized}
          onToggleWidth={onToggleWidth}
        />
      )}

      {empty ? (
        <RightPanePicker onPick={openTool} />
      ) : (
        tabs.map((tab) => (
          <div
            key={tab.id}
            hidden={tab.id !== activeId}
            className="flex min-h-0 flex-1 flex-col"
          >
            <RightPaneTabBody
              tab={tab}
              active={tab.id === activeId}
              workspaceId={workspaceId}
              changes={changes}
              additions={additions}
              deletions={deletions}
              selectedFilePath={selectedFilePath}
              selectedFileContent={selectedFileContent}
              onSelectFile={onSelectFile}
            />
          </div>
        ))
      )}
    </section>
  )
}
