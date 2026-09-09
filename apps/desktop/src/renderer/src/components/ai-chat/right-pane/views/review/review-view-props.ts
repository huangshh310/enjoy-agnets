/**
 * Review 栏入参：工作区改动与当前选中文件。
 */
import type { ChangedFileRow } from "@renderer/stores/chat-store"

export type ReviewViewProps = {
  workspaceId: string | null
  changes: ChangedFileRow[]
  additions: number
  deletions: number
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
  active?: boolean
}
