/**
 * Changes 栏选中文件的 git diff 预览。
 */
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import type { FileDiffResult } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { SourceFilePreview } from "../source-file-preview"
import { FileDiff } from "./file-diff"
import { useT } from "@renderer/i18n"
import { sameReviewPath } from "../right-pane/views/review/same-review-path"
import { useSourceFileReveal } from "../thread/sources/source-file-reveal"
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
  const reveal = useSourceFileReveal((state) => state.reveal)
  const forcePreview = reveal?.view === "preview" && sameReviewPath(reveal.path, path)
  const query = useQuery({
    queryKey: ["workspace-diff", workspaceId, path, hideWhitespace],
    queryFn: () =>
      getIde().workspace.diff({
        workspaceId,
        path,
        ignoreWhitespace: hideWhitespace
      }) as Promise<FileDiffResult>,
    enabled: !forcePreview
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
  if (!forcePreview && query.isPending) {
    return (
      <p className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
        {t("chat.loadingDiff")}
      </p>
    )
  }

  if (!forcePreview && model && model.hunks.length > 0) {
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
  return <SourceFilePreview path={path} content={effectiveContent} />
}
