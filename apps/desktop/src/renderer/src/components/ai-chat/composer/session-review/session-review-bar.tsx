/**
 * 本轮改动条：文件折叠列表 + 运行计时 + Undo/Keep/Review。宠物在条外顶边。
 */
import { useEffect, useState } from "react"
import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { SessionReviewActions } from "./session-review-actions"
import { SessionFileRow, SessionFileTrigger, sessionFileListClassName } from "./session-review-files"
import { SessionReviewRuntime } from "./session-review-runtime"
import type { SessionReviewFile } from "./session-review.types"

export function SessionReviewBar({
  files,
  running,
  runStartedAt,
  modelLabel,
  onOpenReview,
  onOpenFile,
  onUndo,
  onKeep,
  busy
}: {
  files: SessionReviewFile[]
  running?: boolean
  runStartedAt?: number
  modelLabel?: string
  onOpenReview: () => void
  onOpenFile: (path: string) => void
  onUndo: () => void
  onKeep: () => void
  busy?: boolean
}) {
  const t = useT()
  const many = files.length > 1
  const [expanded, setExpanded] = useState(many)
  const first = files[0]

  useEffect(() => {
    setExpanded(many)
  }, [many])

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex h-7 min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {many ? (
            <button
              type="button"
              title={expanded ? t("chat.sessionReviewCollapse") : t("chat.sessionReviewExpand")}
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
              className="group flex cursor-pointer items-center gap-1 py-0.5 text-left text-text-secondary transition-colors hover:text-text-primary"
            >
              {expanded ? (
                <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary group-hover:text-text-primary" />
              ) : (
                <RiArrowRightSLine className="size-3.5 shrink-0 text-text-tertiary group-hover:text-text-primary" />
              )}
              <span className="truncate font-mono text-[12px] font-medium tracking-tight text-text-primary/90">
                {t("chat.sessionReviewFiles", { n: files.length })}
              </span>
            </button>
          ) : first ? (
            <SessionFileTrigger
              file={first}
              title={t("chat.sessionReviewOpenFile", { name: first.name })}
              onOpen={onOpenFile}
            />
          ) : null}

          {running && runStartedAt ? (
            <div className="ml-1 border-l border-border-button-default/50 pl-2.5">
              <SessionReviewRuntime modelLabel={modelLabel || "Enjoy Agents"} startedAt={runStartedAt} />
            </div>
          ) : null}
        </div>

        <SessionReviewActions
          busy={busy}
          onUndo={onUndo}
          onKeep={onKeep}
          onOpenReview={onOpenReview}
        />
      </div>

      {many ? (
        <ul className={sessionFileListClassName(expanded)}>
          {files.map((file) => (
            <li key={file.path}>
              <SessionFileRow file={file} onOpen={onOpenFile} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
