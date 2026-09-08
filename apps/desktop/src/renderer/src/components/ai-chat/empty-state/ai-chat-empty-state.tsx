/**
 * 会话空状态：画布正中的 Composer 簇。居中是工作台，不是营销 Hero。
 */
import type { ReactNode } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { cx } from "@/utils/cx"
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

  const activeWorkspaceName = workspaceName ?? storeWorkspaceName
  const activeRootLabel = workspaceRootLabel ?? storeWorkspaceRootLabel
  const activeChangesCount = changesCount ?? storeChanges.length

  function handleSelect(promptText: string) {
    if (onSelectPrompt) {
      onSelectPrompt(promptText)
    } else {
      setComposer(promptText)
    }
    focusComposerEnd(promptText)
  }

  return (
    <div
      className={cx(
        "relative flex size-full min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(59,130,246,0.12),transparent)] dark:bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(59,130,246,0.18),transparent)]"
      />
      <div className="relative z-10 flex w-full max-w-[760px] flex-col items-center">
        <EmptyStateHeader
          workspaceName={activeWorkspaceName}
          workspaceRootLabel={activeRootLabel}
          changesCount={activeChangesCount}
        />
        {children ? (
          <div className="mt-6 w-full rounded-[22px] shadow-card">{children}</div>
        ) : null}
        <EmptyStatePills onSelectPrompt={handleSelect} className="mt-4" />
      </div>
    </div>
  )
}
