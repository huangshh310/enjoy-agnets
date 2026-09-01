/**
 * Composer 顶栏：Context 按钮、执行模式、工作区胶囊。
 */
import { RiAddLine, RiFolder6Line } from "@remixicon/react"
import { ExecutionModeMenu } from "../execution-mode-menu"
import { useChatStore } from "@renderer/stores/chat-store"

export function ComposerToolbar({ onPickFiles }: { onPickFiles: () => void }) {
  const mode = useChatStore((state) => state.mode)
  const setMode = useChatStore((state) => state.setMode)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5 px-3.5 pt-2.5 pb-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-label="Add context"
          onClick={onPickFiles}
          className="inline-flex items-center gap-1 rounded-full border border-border-button-default/60 bg-background-secondary-default/70 px-2.5 py-1 text-caption-2-medium text-text-secondary shadow-2xs transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
        >
          <RiAddLine className="size-3.5 text-foreground-icon-secondary" />
          <span>Context</span>
        </button>
        <ExecutionModeMenu mode={mode} onChange={setMode} />
      </div>

      {workspaceId ? (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border-button-default/60 bg-background-secondary-default/60 px-2.5 py-0.5 text-caption-2-medium text-text-secondary shadow-2xs">
          <RiFolder6Line className="size-3 text-accent-500" />
          <span className="max-w-[120px] truncate text-caption-2-medium text-text-primary">
            {workspaceName}
          </span>
          <span className="text-text-tertiary">·</span>
          <span className="text-caption-2-medium text-text-tertiary">本地</span>
        </div>
      ) : null}
    </div>
  )
}
