/**
 * 审查主区：默认当前文件满高 diff；「展开全部差异」叠 compact 卡片（禁止 fill）。
 * #117：展开流每文件「留下 / 丢掉」；流式不可决；整批现网按钮不动。
 */

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde } from "@renderer/lib/ide"
import type { DiffPalette } from "../../../../diff/diff-palette"
import {
  canDecideFileDiff,
  type FileDiffDecision
} from "../../../../diff/file-diff-decision"
import type { ReviewOptions } from "../types/review.types"
import { ReviewDiffPane } from "./review-diff-pane"
import { ReviewFileCard } from "./review-file-card"

export function ReviewDiffStream(props: {
  workspaceId: string | null
  changes: ChangedFileRow[]
  options: ReviewOptions
  palette?: DiffPalette
  allExpanded: boolean
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
}) {
  const {
    workspaceId,
    changes,
    options,
    palette = "default",
    allExpanded,
    selectedFilePath,
    selectedFileContent,
    onSelectFile
  } = props
  const queryClient = useQueryClient()
  const running = useChatStore((s) => s.running)
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [decisions, setDecisions] = useState<Record<string, FileDiffDecision>>({})
  const [busyPath, setBusyPath] = useState<string | null>(null)
  const decidable = canDecideFileDiff({ streaming: Boolean(running) })

  useEffect(() => {
    setExpandedMap((prev) => {
      const next: Record<string, boolean> = {}
      let same = Object.keys(prev).length === changes.length
      for (const file of changes) {
        next[file.path] = allExpanded
        if (prev[file.path] !== allExpanded) same = false
      }
      return same ? prev : next
    })
  }, [allExpanded, changes])

  function keepFile(path: string) {
    setDecisions((prev) => ({ ...prev, [path]: "kept" }))
  }

  async function discardFile(path: string) {
    if (!workspaceId) {
      setDecisions((prev) => ({ ...prev, [path]: "discarded" }))
      return
    }
    setBusyPath(path)
    try {
      await getIde().workspace.gitRestore({ workspaceId, paths: [path] })
      setDecisions((prev) => ({ ...prev, [path]: "discarded" }))
      await queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] })
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error)
      useChatStore.getState().setError(raw)
    } finally {
      setBusyPath(null)
    }
  }

  if (!allExpanded) {
    return (
      <ReviewDiffPane
        workspaceId={workspaceId}
        changes={changes}
        selectedFilePath={selectedFilePath}
        selectedFileContent={selectedFileContent}
        onSelectFile={onSelectFile}
        options={options}
        palette={palette}
      />
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <div className="flex flex-col gap-2">
        {changes.map((file) => {
          const decision = decisions[file.path] ?? "pending"
          const isExpanded =
            decision === "discarded" ? false : (expandedMap[file.path] ?? true)
          return (
            <ReviewFileCard
              key={file.path}
              workspaceId={workspaceId ?? ""}
              file={file}
              options={options}
              palette={palette}
              isExpanded={isExpanded}
              onToggleExpand={() =>
                setExpandedMap((prev) => ({
                  ...prev,
                  [file.path]: !prev[file.path]
                }))
              }
              onSelectFile={onSelectFile}
              isSelected={file.path === selectedFilePath}
              decision={decision}
              decidable={decidable}
              decisionBusy={busyPath === file.path}
              onKeepFile={() => keepFile(file.path)}
              onDiscardFile={() => void discardFile(file.path)}
            />
          )
        })}
      </div>
    </div>
  )
}
