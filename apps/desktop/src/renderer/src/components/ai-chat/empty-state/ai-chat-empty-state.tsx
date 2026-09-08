/**
 * 空会话工作清单：检测 / 缺口 / 示例任务。左对齐，不是营销 Hero。
 */
import type { ReactNode } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { cx } from "@/utils/cx"
import { EmptyStateChecklist } from "./checklist/empty-state-checklist"
import { EmptyStateHeader } from "./empty-state-header"
import { EmptyStatePills } from "./empty-state-pills"
import { focusComposerEnd } from "./focus-composer"
import type { AiChatEmptyStateProps } from "./empty-state.types"

interface EmptyZeroStateProps extends AiChatEmptyStateProps {
  children?: ReactNode
}

export function AiChatEmptyState({
  workspaceName,
  workspaceRootLabel,
  changesCount,
  onSelectPrompt,
  children,
  className
}: EmptyZeroStateProps) {
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
        "relative flex size-full min-h-0 flex-1 flex-col items-start justify-start overflow-y-auto px-6 py-6",
        className
      )}
    >
      <div className="flex w-full max-w-xl flex-col items-start">
        <EmptyStateHeader
          workspaceName={workspaceName ?? storeWorkspaceName}
          workspaceRootLabel={workspaceRootLabel ?? storeWorkspaceRootLabel}
          changesCount={changesCount ?? storeChanges.length}
        />
        <div className="mt-4 w-full">
          <EmptyStateChecklist />
        </div>
        {children ? <div className="mt-5 w-full">{children}</div> : null}
        <EmptyStatePills onSelectPrompt={handleSelect} className="mt-4" />
      </div>
    </div>
  )
}
