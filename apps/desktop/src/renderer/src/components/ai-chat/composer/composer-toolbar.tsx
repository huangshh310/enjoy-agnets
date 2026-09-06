/**
 * Composer 顶栏：Context 按钮、执行模式、工作区胶囊。
 */
import { RiAddLine, RiFolder6Line } from "@remixicon/react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function ComposerToolbar({ onPickFiles }: { onPickFiles: () => void }) {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5 px-3.5 pt-2.5 pb-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-label={t("chat.addContext")}
          onClick={onPickFiles}
          className="inline-flex items-center gap-1 rounded-full border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-primary shadow-2xs transition-all hover:bg-background-secondary-hover hover:border-border-button-hover cursor-pointer"
        >
          <RiAddLine className="size-3.5 text-foreground-icon-secondary" />
          <span>{t("chat.context")}</span>
        </button>
      </div>

      {workspaceId ? (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default px-2.5 py-0.5 text-caption-2-medium text-text-primary shadow-2xs">
          <RiFolder6Line className="size-3 text-accent-500" />
          <span className="max-w-[120px] truncate text-caption-2-medium text-text-primary">
            {workspaceName}
          </span>
          <span className="text-text-tertiary">·</span>
          <span className="text-caption-2-medium text-text-tertiary">{t("chat.local")}</span>
        </div>
      ) : null}
    </div>
  )
}
