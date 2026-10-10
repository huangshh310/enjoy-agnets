/**
 * 未提交文件清单：状态字母 + 路径，对齐 PR 变更文件表。
 */
import { RiGitCommitLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { PANE_FOCUS } from "../../constants"
import { splitReviewPath } from "./path-label"

const STATUS_MARK: Record<ChangedFileRow["status"], { mark: string; tone: string }> = {
  added: { mark: "A", tone: "text-state-success-text" },
  modified: { mark: "M", tone: "text-accent-500" },
  deleted: { mark: "D", tone: "text-text-error-primary" },
  untracked: { mark: "U", tone: "text-text-tertiary" }
}

export function ChangesList(props: {
  changes: ChangedFileRow[]
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  onOpenCommits: () => void
}) {
  const { changes, selectedFilePath, onSelectFile, onOpenCommits } = props
  const t = useT()

  if (changes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 bg-background-primary-default p-5 text-center">
        <p className="text-caption-1-medium text-text-tertiary">{t("chat.treeClean")}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenCommits}
          className="h-7 gap-1 text-caption-2-medium"
        >
          <RiGitCommitLine className="size-3" />
          <span>{t("chat.reviewViewHistory")}</span>
        </Button>
      </div>
    )
  }

  return (
    <ul className="flex flex-col">
      {changes.map((file) => {
        const status = STATUS_MARK[file.status]
        const { dir, name } = splitReviewPath(file.path)
        const selected = file.path === selectedFilePath
        return (
          <li key={file.path}>
            <button
              type="button"
              onClick={() => onSelectFile(file.path)}
              className={cx(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left",
                PANE_FOCUS,
                selected
                  ? "bg-background-secondary-default text-text-primary"
                  : "text-text-secondary hover:bg-background-secondary-hover"
              )}
            >
              <span
                className={cx("w-3 shrink-0 text-center font-mono text-caption-2-semibold", status.tone)}
              >
                {status.mark}
              </span>
              <span className="min-w-0 flex-1 truncate text-caption-1-medium">
                {dir ? (
                  <>
                    <span className="text-text-tertiary">{dir}/</span>
                    <span className="text-text-primary">{name}</span>
                  </>
                ) : (
                  <span className="text-text-primary">{name}</span>
                )}
              </span>
              <span className="shrink-0 font-mono text-caption-2-medium tabular-nums text-state-success-text">
                +{file.additions}
              </span>
              <span className="shrink-0 font-mono text-caption-2-medium tabular-nums text-text-error-primary">
                -{file.deletions}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
