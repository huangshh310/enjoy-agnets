/**
 * Changes 栏选中文件的 git diff 预览。
 */
import { useQuery } from "@tanstack/react-query"
import { parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import type { FileDiffResult } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { AiChatCodePane } from "../ai-chat-code-pane"
import { FileDiff } from "./file-diff"
import { useT } from "@renderer/i18n"

export function ChangesFileDiff({
  workspaceId,
  path,
  fallbackContent
}: {
  workspaceId: string
  path: string
  fallbackContent: string
}) {
  const t = useT()
  const query = useQuery({
    queryKey: ["workspace-diff", workspaceId, path],
    queryFn: () =>
      getIde().workspace.diff({ workspaceId, path }) as Promise<FileDiffResult>
  })

  if (query.isPending) {
    return (
      <p className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
        {t("chat.loadingDiff")}
      </p>
    )
  }

  if (query.data?.diff?.trim()) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        <FileDiff model={parseUnifiedDiff(query.data.diff, path)} />
      </div>
    )
  }

  return <AiChatCodePane path={path} value={fallbackContent} />
}
