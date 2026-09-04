/**
 * 审查主区：默认当前文件满高 diff；「展开全部差异」叠 compact 卡片（禁止 fill）。
 */

import { useState, useEffect } from "react"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import type { ReviewOptions } from "../types/review.types"
import { ReviewDiffPane } from "./review-diff-pane"
import { ReviewFileCard } from "./review-file-card"

export function ReviewDiffStream(props: {
  workspaceId: string | null
  changes: ChangedFileRow[]
  options: ReviewOptions
  allExpanded: boolean
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
}) {
  const {
    workspaceId,
    changes,
    options,
    allExpanded,
    selectedFilePath,
    selectedFileContent,
    onSelectFile
  } = props
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const file of changes) next[file.path] = allExpanded
    setExpandedMap(next)
  }, [allExpanded, changes])

  if (!allExpanded) {
    return (
      <ReviewDiffPane
        workspaceId={workspaceId}
        changes={changes}
        selectedFilePath={selectedFilePath}
        selectedFileContent={selectedFileContent}
        onSelectFile={onSelectFile}
        options={options}
      />
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <div className="flex flex-col gap-2">
        {changes.map((file) => (
          <ReviewFileCard
            key={file.path}
            workspaceId={workspaceId ?? ""}
            file={file}
            options={options}
            isExpanded={expandedMap[file.path] ?? true}
            onToggleExpand={() =>
              setExpandedMap((prev) => ({ ...prev, [file.path]: !prev[file.path] }))
            }
            onSelectFile={onSelectFile}
            isSelected={file.path === selectedFilePath}
          />
        ))}
      </div>
    </div>
  )
 }
