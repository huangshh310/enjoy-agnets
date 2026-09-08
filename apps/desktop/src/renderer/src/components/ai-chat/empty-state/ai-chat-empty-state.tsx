/**
 * 空会话工作清单：只允许标题 + checklist + pills。Composer 钉在 Stage 底，不进本组件。
 * 禁止同步/运维条（技能源拉取、SessionReviewBar 同类噪音），也禁止 Registry / AgentCliInstall。
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
  workspaceRootLabel,
  changesCount,
  onSelectPrompt,
  className
}: AiChatEmptyStateProps) {
  const storeWorkspaceName = useChatStore((state) => state.workspaceName)
  const storeWorkspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const storeChanges = useChatStore((state) => state.changes)
  const setComposer = useChatStore((state) => state.setComposer)

  function handleSelect(promptText: string) {
    if (onSelectPrompt) onSelectPrompt(promptText)
    else setComposer(promptText)
    focusComposerEnd(promptText)
  }

  return (
    <div
      className={cx(
        "relative flex size-full min-h-0 flex-1 flex-col items-start justify-start overflow-y-auto px-6 pt-4 pb-4",
        className
      )}
    >
      <div className="flex w-full max-w-xl flex-col items-start">
        <EmptyStateHeader
          workspaceName={workspaceName ?? storeWorkspaceName}
          workspaceRootLabel={workspaceRootLabel ?? storeWorkspaceRootLabel}
          changesCount={changesCount ?? storeChanges.length}
        />
        <div className="mt-3 w-full">
          <EmptyStateChecklist />
        </div>
        <EmptyStatePills onSelectPrompt={handleSelect} className="mt-3" />
      </div>
    </div>
  )
}
