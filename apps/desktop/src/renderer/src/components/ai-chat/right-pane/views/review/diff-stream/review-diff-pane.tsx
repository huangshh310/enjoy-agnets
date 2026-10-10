/**
 * Codex 主审查区：当前文件的满高 diff。
 * 用 absolute inset-0 锁死高度，避免嵌套 flex 把 FileDiff 压扁。
 */

import { useEffect } from "react"
import { RiCheckLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { ChangesFileDiff } from "../../../../diff/changes-file-diff"
import { sameReviewPath } from "../same-review-path"
import type { DiffPalette } from "../../../../diff/diff-palette"
import type { ReviewOptions } from "../types/review.types"

export function ReviewDiffPane(props: {
  workspaceId: string | null
  changes: ChangedFileRow[]
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
  options?: ReviewOptions
  palette?: DiffPalette
}) {
  const { workspaceId, changes, selectedFilePath, selectedFileContent, onSelectFile, options, palette } = props
  const t = useT()

  const matched = selectedFilePath
    ? changes.find((file) => sameReviewPath(file.path, selectedFilePath))
    : undefined
  const activePath = matched?.path ?? selectedFilePath ?? changes[0]?.path ?? null

  useEffect(() => {
    if (selectedFilePath) return
    if (activePath) onSelectFile(activePath)
  }, [activePath, selectedFilePath, onSelectFile])

  if (changes.length === 0 && !activePath) {
    return (
      <div
        data-testid="review-diff-empty"
        className="flex h-full flex-col items-center justify-center gap-2 bg-background-primary-default p-8 text-center text-text-tertiary"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-state-success-text/10 text-state-success-text">
          <RiCheckLine className="size-5" />
        </div>
        <p className="text-body-medium font-medium text-text-secondary">{t("chat.treeClean")}</p>
      </div>
    )
  }

  if (!workspaceId || !activePath) {
    return (
      <div className="flex h-full items-center justify-center text-caption-1-medium text-text-tertiary">
        {t("chat.selectChanged")}
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-0">
      <div className="absolute inset-0 flex flex-col overflow-hidden bg-background-primary-default">
        <ChangesFileDiff
          key={`${activePath}-${options?.hideWhitespace ? "w" : "s"}`}
          workspaceId={workspaceId}
          path={activePath}
          fallbackContent={selectedFileContent}
          options={options}
          palette={palette}
        />
      </div>
    </div>
  )
}
