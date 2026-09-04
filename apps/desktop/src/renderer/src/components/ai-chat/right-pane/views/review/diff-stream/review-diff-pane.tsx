/**
 * Codex 主审查区：当前文件的满高 diff。
 * 用 absolute inset-0 锁死高度，避免嵌套 flex 把 FileDiff 压扁。
 */

import { useEffect } from "react"
import { RiCheckLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { ChangesFileDiff } from "../../../../diff/changes-file-diff"
import type { ReviewOptions } from "../types/review.types"

export function ReviewDiffPane(props: {
  workspaceId: string | null
  changes: ChangedFileRow[]
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
  options?: ReviewOptions
}) {
  const { workspaceId, changes, selectedFilePath, selectedFileContent, onSelectFile, options } = props
  const t = useT()

  const activePath =
    selectedFilePath && changes.some((file) => file.path === selectedFilePath)
      ? selectedFilePath
      : (changes[0]?.path ?? null)

  useEffect(() => {
    if (!activePath || activePath === selectedFilePath) return
    onSelectFile(activePath)
  }, [activePath, selectedFilePath, onSelectFile])

  if (changes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-text-tertiary">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
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
        />
      </div>
    </div>
  )
}
