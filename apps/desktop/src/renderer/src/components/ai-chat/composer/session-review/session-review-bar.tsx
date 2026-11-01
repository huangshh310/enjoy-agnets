/**
 * 本轮改动条：文件折叠列表 + 运行计时 + Undo/Keep/Review。
 * #117：每文件「留下 / 丢掉」；整批按钮文案保持现网。
 */
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { FileDiffActions } from "../../diff/file-diff-actions"
import type { FileDiffDecision } from "../../diff/file-diff-decision"
import { SessionReviewActions } from "./session-review-actions"
import { SessionFileRow, SessionFileTrigger, sessionFileListClassName } from "./session-review-files"
import { SessionReviewRuntime } from "./session-review-runtime"
import type { SessionReviewBarProps } from "./session-review.types"

export function SessionReviewBar({
  files,
  running,
  runStartedAt,
  waitingApproval,
  modelLabel,
  onOpenReview,
  onOpenFile,
  onUndo,
  onKeep,
  onOpenPreview,
  canOpenPreview,
  previewBusy,
  busy,
  hasFiles,
  defaultExpanded = false,
  placeholderKey = "chat.sessionReviewUnknownPlaceholder"
}: SessionReviewBarProps) {
  const t = useT()
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((s) => s.workspaceId)
  const many = files.length > 1
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [decisions, setDecisions] = useState<Record<string, FileDiffDecision>>({})
  const [busyPath, setBusyPath] = useState<string | null>(null)
  const first = files[0]
  const visible = files.filter((file) => decisions[file.path] !== "discarded")

  useEffect(() => {
    setExpanded(defaultExpanded)
  }, [defaultExpanded, files.length])

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
              <span className="truncate font-mono text-caption-1-medium tracking-tight text-text-primary/90">
                {t("chat.sessionReviewFiles", { n: visible.length })}
              </span>
            </button>
          ) : first ? (
            <div className="flex min-w-0 items-center gap-2">
              <SessionFileTrigger
                file={first}
                title={t("chat.sessionReviewOpenFile", { name: first.name })}
                onOpen={onOpenFile}
              />
              <FileDiffActions
                decision={decisions[first.path] ?? "pending"}
                disabled={Boolean(running)}
                busy={busyPath === first.path || busy}
                onKeep={() => keepFile(first.path)}
                onDiscard={() => void discardFile(first.path)}
              />
            </div>
          ) : running ? null : (
            <span className="truncate text-caption-2-regular text-text-tertiary">
              {t(placeholderKey)}
            </span>
          )}

          {running && runStartedAt ? (
            <div className="ml-1 border-l border-border-button-default/50 pl-2.5">
              <SessionReviewRuntime
                modelLabel={modelLabel || t("chat.sessionReviewDefaultModel")}
                startedAt={runStartedAt}
                waiting={Boolean(waitingApproval)}
              />
            </div>
          ) : null}
        </div>

        <SessionReviewActions
          busy={busy}
          hasFiles={hasFiles}
          canOpenPreview={canOpenPreview}
          previewBusy={previewBusy}
          onUndo={onUndo}
          onKeep={onKeep}
          onOpenReview={onOpenReview}
          onOpenPreview={onOpenPreview}
        />
      </div>

      {many ? (
        <ul className={sessionFileListClassName(expanded)}>
          {files.map((file) => (
            <li key={file.path}>
              <SessionFileRow
                file={file}
                onOpen={onOpenFile}
                decision={decisions[file.path] ?? "pending"}
                decidable={!running}
                busy={busyPath === file.path || busy}
                onKeep={() => keepFile(file.path)}
                onDiscard={() => void discardFile(file.path)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
