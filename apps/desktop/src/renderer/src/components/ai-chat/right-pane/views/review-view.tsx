/**
 * 审查视图：未提交变更列表 + diff 预览。
 */
import { RiShareForwardLine, RiSparklingFill } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { cx } from "@/utils/cx"
import { PANE_FOCUS } from "../constants"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { ChangesFileDiff } from "../../diff/changes-file-diff"
import { useT } from "@renderer/i18n"

export function ReviewView({
  workspaceId,
  changes,
  additions,
  deletions,
  selectedFilePath,
  selectedFileContent,
  onSelectFile
}: {
  workspaceId: string | null
  changes: ChangedFileRow[]
  additions: number
  deletions: number
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
}) {
  const t = useT()
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-4 py-2">
        <p className="min-w-0 flex-1 text-body-medium text-text-primary">
          {t("chat.uncommitted", { count: changes.length })}
        </p>
        <span className="font-mono text-caption-1-medium tabular-nums text-state-success-text">
          +{additions}
        </span>
        <span className="font-mono text-caption-1-medium tabular-nums text-text-error-primary">
          -{deletions}
        </span>
        <QuietIconButton icon={RiShareForwardLine} aria-label={t("chat.shareChanges")} />
      </div>

      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto px-2 pb-2">
        {changes.length === 0 ? (
          <p className="px-2 py-1 text-caption-1-medium text-text-tertiary">{t("chat.treeClean")}</p>
        ) : null}
        {changes.map((file) => (
          <button
            key={file.path}
            type="button"
            onClick={() => onSelectFile(file.path)}
            className={cx(
              "flex items-center gap-2 rounded-2lg px-2 py-1.5 text-left",
              PANE_FOCUS,
              file.path === selectedFilePath
                ? "bg-background-secondary-default"
                : "hover:bg-background-secondary-hover"
            )}
          >
            <RiSparklingFill className="size-4 text-accent-500" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-secondary">
              {file.path}
            </span>
            <span className="shrink-0 font-mono text-caption-1-medium tabular-nums text-state-success-text">
              +{file.additions}
            </span>
            <span className="shrink-0 font-mono text-caption-1-medium tabular-nums text-text-error-primary">
              -{file.deletions}
            </span>
          </button>
        ))}
      </div>

      {selectedFilePath && workspaceId ? (
        <ChangesFileDiff
          workspaceId={workspaceId}
          path={selectedFilePath}
          fallbackContent={selectedFileContent}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
          {t("chat.selectChanged")}
        </div>
      )}
    </div>
  )
}
