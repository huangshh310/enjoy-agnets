/**
 * 按标签种类挂审查 / 终端 / 浏览器 / 文件，避免外壳里级联判断。
 */
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import type { RightPaneTab } from "./right-pane.types"
import { BrowserView } from "./views/browser-view"
import { FilesView } from "./views/files-view"
import { ReviewView } from "./views/review-view"
import { TerminalView } from "./views/terminal-view"

export function RightPaneTabBody({
  tab,
  workspaceId,
  changes,
  additions,
  deletions,
  selectedFilePath,
  selectedFileContent,
  onSelectFile
}: {
  tab: RightPaneTab
  workspaceId: string | null
  changes: ChangedFileRow[]
  additions: number
  deletions: number
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
}) {
  if (tab.kind === "review") {
    return (
      <ReviewView
        workspaceId={workspaceId}
        changes={changes}
        additions={additions}
        deletions={deletions}
        selectedFilePath={selectedFilePath}
        selectedFileContent={selectedFileContent}
        onSelectFile={onSelectFile}
      />
    )
  }
  if (tab.kind === "terminal") return <TerminalView workspaceId={workspaceId} />
  if (tab.kind === "browser") return <BrowserView />
  return <FilesView workspaceId={workspaceId} />
}
