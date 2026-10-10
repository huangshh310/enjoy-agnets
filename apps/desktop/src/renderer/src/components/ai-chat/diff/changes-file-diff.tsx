/**
 * Changes 栏选中文件的 git diff 预览。
 */
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import { RiCodeSSlashLine } from "@remixicon/react"
import type { FileDiffResult } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { AiChatCodePane } from "../ai-chat-code-pane"
import { FileDiff } from "./file-diff"
import { useT } from "@renderer/i18n"
import type { DiffPalette } from "./diff-palette"
import type { ReviewOptions } from "../right-pane/views/review/types/review.types"
import { commentDiffLine } from "./comment-diff-line"

export function ChangesFileDiff({
  workspaceId,
  path,
  fallbackContent,
  options,
  palette = "default"
}: {
  workspaceId: string
  path: string
  fallbackContent: string
  options?: ReviewOptions
  palette?: DiffPalette
}) {
  const t = useT()
  const hideWhitespace = options?.hideWhitespace ?? false
  const query = useQuery({
    queryKey: ["workspace-diff", workspaceId, path, hideWhitespace],
    queryFn: () =>
      getIde().workspace.diff({
        workspaceId,
        path,
        ignoreWhitespace: hideWhitespace
      }) as Promise<FileDiffResult>
  })
  const fileContentQuery = useQuery({
    queryKey: ["workspace-file-content", workspaceId, path],
    queryFn: () =>
      getIde().workspace.readFile({
        workspaceId,
        path
      }) as Promise<string>,
    enabled: Boolean(workspaceId && path && !fallbackContent)
  })
  const diffText = query.data?.diff
  const model = useMemo(() => {
    if (!diffText?.trim()) return null
    return parseUnifiedDiff(diffText, path)
  }, [diffText, path])
  if (query.isPending) {
    return (
      <p className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
        {t("chat.loadingDiff")}
      </p>
    )
  }

  if (model && model.hunks.length > 0) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <FileDiff
          model={model}
          fill
          wordWrap={options?.wordWrap}
          wordDiff={options?.wordDiff}
          hideWhitespace={hideWhitespace}
          foldLargeFiles={options?.foldLargeFiles}
          palette={palette}
          onCommentLine={(line) => commentDiffLine(path, line)}
        />
      </div>
    )
  }

  const effectiveContent = fallbackContent || fileContentQuery.data || ""
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background-primary-default">
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-separator-border/70 bg-background-secondary-default/50 px-3.5 text-caption-1-regular select-none">
        <div className="flex items-center gap-2 min-w-0">
          <RiCodeSSlashLine className="size-4 shrink-0 text-text-tertiary" />
          <span
            data-testid="source-file-path"
            className="min-w-0 truncate font-mono font-semibold text-text-primary"
          >
            {path}
          </span>
        </div>
        <span className="shrink-0 rounded border border-border-button-default bg-background-primary-default px-1.5 py-0.5 font-mono text-caption-2-medium font-medium text-text-tertiary">
          Read-only
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AiChatCodePane path={path} value={effectiveContent} />
      </div>
    </div>
  )
}
