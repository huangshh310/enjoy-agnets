/**
 * 变更审查：左文件树（可拖拽改宽）+ 右 diff；提交底栏贴底。
 */

import type { ChangedFileRow } from "@renderer/stores/chat-store"
import type { ReviewOptions } from "./types/review.types"
import { ReviewCommitDock } from "./pr-hero/review-commit-dock"
import { ReviewDiffStream } from "./diff-stream/review-diff-stream"
import { ReviewFileTree } from "./file-tree/review-file-tree"
import { ReviewSplit } from "./review-split"

export function ChangesReview(props: {
  workspaceId: string | null
  workspaceName: string
  branch: string
  changes: ChangedFileRow[]
  additions: number
  deletions: number
  selectedFilePath: string | null
  selectedFileContent: string
  options: ReviewOptions
  allExpanded: boolean
  onSelectFile: (path: string) => void
  onCommit?: (message: string) => Promise<{ ok: boolean; output?: string }>
}) {
  const {
    workspaceId,
    changes,
    selectedFilePath,
    selectedFileContent,
    options,
    allExpanded,
    onSelectFile,
    onCommit
  } = props

  const diff = (
    <ReviewDiffStream
      workspaceId={workspaceId}
      changes={changes}
      options={options}
      allExpanded={allExpanded}
      selectedFilePath={selectedFilePath}
      selectedFileContent={selectedFileContent}
      onSelectFile={onSelectFile}
    />
  )

  const tree = (
    <ReviewFileTree
      changes={changes}
      selectedFilePath={selectedFilePath}
      onSelectFile={onSelectFile}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background-primary-default">
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        {options.fileTreeVisible && changes.length > 0 ? (
          <ReviewSplit tree={tree}>{diff}</ReviewSplit>
        ) : (
          <div className="relative min-h-0 flex-1 overflow-hidden">{diff}</div>
        )}
      </div>

      {changes.length > 0 && onCommit ? (
        <footer className="shrink-0 border-t border-separator-border bg-background-primary-default px-3 py-2">
          <ReviewCommitDock changesCount={changes.length} onCommit={onCommit} />
        </footer>
      ) : null}
    </div>
  )
}
