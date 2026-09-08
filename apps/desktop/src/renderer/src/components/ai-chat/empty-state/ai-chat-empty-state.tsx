/**
 * 空会话引导：标题 + 已检测/未安装 + pills。Composer 不在本文件。
 * 高度跟内容走；根节点不得再吃剩余列高或垂直居中。
 * 禁止同步/运维条（技能源拉取、SessionReviewBar），也禁止 Registry / AgentCliInstall。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { cx } from "@/utils/cx"
import { EmptyStateChecklist } from "./checklist/empty-state-checklist"
import { EmptyStateHeader } from "./empty-state-header"
import { EmptyStatePills } from "./empty-state-pills"
import { focusComposerEnd } from "./focus-composer"
import type { AiChatEmptyStateProps } from "./empty-state.types"

export function AiChatEmptyState({
  workspaceName,
  sessionTitle,
  workspaceRootLabel,
  changesCount,
  onSelectPrompt,
  className
}: AiChatEmptyStateProps) {
  const storeWorkspaceName = useChatStore((state) => state.workspaceName)
  const storeSessionTitle = useChatStore((state) => state.sessionTitle)
  const storeWorkspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const storeChanges = useChatStore((state) => state.changes)
  const setComposer = useChatStore((state) => state.setComposer)

  function handleSelect(promptText: string) {
    if (onSelectPrompt) onSelectPrompt(promptText)
    else setComposer(promptText)
    focusComposerEnd(promptText)
  }

  return (
    <div className={cx("flex flex-col items-start justify-start px-6", className)}>
      <div className="flex w-full max-w-xl shrink-0 flex-col gap-3 pt-3">
        <EmptyStateHeader
          sessionTitle={sessionTitle ?? storeSessionTitle}
          workspaceName={workspaceName ?? storeWorkspaceName}
          workspaceRootLabel={workspaceRootLabel ?? storeWorkspaceRootLabel}
          changesCount={changesCount ?? storeChanges.length}
        />
        <EmptyStateChecklist />
        <EmptyStatePills onSelectPrompt={handleSelect} />
      </div>
    </div>
  )
}
