/**
 * 空会话开始面的上段：问候 + 引擎摘要。Composer / pills 在 Stage 里，不进本文件。
 * 高度跟内容走；禁止 Registry / AgentCliInstall / 技能源条。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { cx } from "@/utils/cx"
import { EmptyStateChecklist } from "./checklist/empty-state-checklist"
import { EmptyStateHeader } from "./empty-state-header"
import type { AiChatEmptyStateProps } from "./empty-state.types"

export function AiChatEmptyState({
  workspaceName,
  sessionTitle,
  workspaceRootLabel,
  changesCount,
  className
}: AiChatEmptyStateProps) {
  const storeWorkspaceName = useChatStore((state) => state.workspaceName)
  const storeSessionTitle = useChatStore((state) => state.sessionTitle)
  const storeWorkspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const storeChanges = useChatStore((state) => state.changes)

  return (
    <div className={cx("flex w-full max-w-3xl shrink-0 flex-col items-center gap-4", className)}>
      <EmptyStateHeader
        sessionTitle={sessionTitle ?? storeSessionTitle}
        workspaceName={workspaceName ?? storeWorkspaceName}
        workspaceRootLabel={workspaceRootLabel ?? storeWorkspaceRootLabel}
        changesCount={changesCount ?? storeChanges.length}
      />
      <EmptyStateChecklist changesCount={changesCount ?? storeChanges.length} />
    </div>
  )
}
