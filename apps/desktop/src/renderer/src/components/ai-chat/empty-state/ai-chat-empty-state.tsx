/**
 * 会话空状态主聚合组件（Centered Hero Zero State）
 * 参考 Bolt.new / Claude / Zap 顶级居中聚焦设计，将标题、居中输入框与行动胶囊无缝融合。
 */
import type { ReactNode } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { cx } from "@/utils/cx"
import { EmptyStateHeader } from "./empty-state-header"
import { EmptyStatePills } from "./empty-state-pills"
import type { AiChatEmptyStateProps } from "./empty-state.types"

interface CenteredZeroStateProps extends AiChatEmptyStateProps {
  children?: ReactNode
}

export function AiChatEmptyState({
  workspaceName,
  workspaceRootLabel,
  changesCount,
  onSelectPrompt,
  children,
  className
}: CenteredZeroStateProps) {
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
    requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>("form textarea")
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(promptText.length, promptText.length)
    })
  }

  return (
    <div
      className={cx(
        "relative flex size-full flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8 animate-in fade-in-50 duration-300",
        className
      )}
    >
      {/* 1. 顶部极简氛围弧光微光晕 (Ambient Horizon Glow) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(59,130,246,0.12),transparent)] dark:bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(59,130,246,0.18),transparent)]"
      />

      {/* 2. 居中黄金比例内容容器 (max-w-[620px]) */}
      <div className="relative z-10 flex w-full max-w-[620px] flex-col items-center my-auto">
        {/* 顶部标题与工作区徽标 */}
        <EmptyStateHeader
          workspaceName={activeWorkspaceName}
          workspaceRootLabel={activeRootLabel}
          changesCount={activeChangesCount}
        />

        {/* 居中核心输入卡片插槽 */}
        {children ? (
          <div className="mt-6 w-full rounded-[22px] shadow-card">
            {children}
          </div>
        ) : null}

        {/* 下方快捷行动胶囊与指令提示 */}
        <EmptyStatePills onSelectPrompt={handleSelect} className="mt-4" />
      </div>
    </div>
  )
}
