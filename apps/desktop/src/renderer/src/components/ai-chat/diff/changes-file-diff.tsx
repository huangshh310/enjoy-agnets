/**
 * Changes 栏选中文件的 git diff 预览。
 */
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import type { FileDiffResult } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { AiChatCodePane } from "../ai-chat-code-pane"
import { FileDiff } from "./file-diff"
import { useT } from "@renderer/i18n"
import type { ReviewOptions } from "../right-pane/views/review/types/review.types"

export function ChangesFileDiff({
  workspaceId,
  path,
  fallbackContent,
  options
}: {
  workspaceId: string
  path: string
  fallbackContent: string
  options?: ReviewOptions
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

  if (model) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <FileDiff
          model={model}
          fill
          wordWrap={options?.wordWrap}
          wordDiff={options?.wordDiff}
          hideWhitespace={hideWhitespace}
          foldLargeFiles={options?.foldLargeFiles}
        />
      </div>
    )
  }

  return <AiChatCodePane path={path} value={fallbackContent} />
}
