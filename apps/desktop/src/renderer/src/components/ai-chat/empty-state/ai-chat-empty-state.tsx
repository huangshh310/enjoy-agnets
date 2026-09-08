/**
 * 空会话工作清单：必须保留 已检测 / 未安装 checklist + 示例 pill。
 * 只压 MissingRow 密度并顶对齐；禁止卸掉两段，也禁止挂设置 Registry。
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
        {children ? <div className="mt-4 w-full">{children}</div> : null}
        <EmptyStatePills onSelectPrompt={handleSelect} className="mt-3" />
      </div>
    </div>
  )
}
