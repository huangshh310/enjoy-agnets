/**
 * 会话空状态下方快捷行动胶囊组件（Action Pills / Prompt Chips）
 */
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { DEFAULT_INTENT_CARDS } from "./empty-state-constants"
import type { EmptyStateIntentItem } from "./empty-state.types"

interface EmptyStatePillsProps {
  onSelectPrompt: (prompt: string) => void
  className?: string
}

export function EmptyStatePills({ onSelectPrompt, className }: EmptyStatePillsProps) {
  const setComposer = useChatStore((state) => state.setComposer)

  function handleTriggerShortcut(key: string) {
    if (key === "@" || key === "/") {
      const current = useChatStore.getState().composer
      const next = current ? `${current} ${key}` : key
      setComposer(next)
      requestAnimationFrame(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>("form textarea")
        if (!textarea) return
        textarea.focus()
        textarea.setSelectionRange(next.length, next.length)
      })
    } else if (key === "cmd-l") {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "l", metaKey: true, bubbles: true }))
    }
  }

  return (
    <div className={cx("flex flex-col items-center gap-3.5 w-full select-none", className)}>
      {/* 1. 快捷意图推荐胶囊栏 */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
        {DEFAULT_INTENT_CARDS.map((item: EmptyStateIntentItem) => {
          const Icon = item.icon
          const displayLabel = item.shortTitle || item.title

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              title={item.description}
              className={cx(
                "group inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5",
                "border border-border-button-default/70 bg-background-secondary-default/50",
                "text-caption-1-medium text-text-secondary shadow-2xs backdrop-blur-xs",
                "hover:border-accent-500/40 hover:bg-background-secondary-default hover:text-text-primary hover:shadow-xs",
                "active:scale-[0.98] transition-all duration-150 cursor-pointer outline-none",
                "focus-visible:ring-2 focus-visible:ring-accent-500/20"
              )}
            >
              <Icon
                className={cx(
                  "size-3.5 transition-colors",
                  item.iconColor ? item.iconColor : "text-text-tertiary group-hover:text-accent-500"
                )}
                aria-hidden
              />
              <span className="font-medium tracking-tight">{displayLabel}</span>
            </button>
          )
        })}
      </div>

      {/* 2. 底部按键与指令引导（支持点击直达） */}
      <div className="flex items-center gap-2 text-caption-2-medium text-text-tertiary">
        <button
          type="button"
          onClick={() => handleTriggerShortcut("@")}
          className="inline-flex items-center gap-1 hover:text-text-secondary transition-colors cursor-pointer"
        >
          <kbd className="rounded bg-background-secondary-default/80 border border-border-button-default/50 px-1.5 py-0.2 font-mono text-[10px] text-text-secondary font-medium">@</kbd>
          <span>引用文件</span>
        </button>
        <span className="text-text-tertiary/40">•</span>
        <button
          type="button"
          onClick={() => handleTriggerShortcut("/")}
          className="inline-flex items-center gap-1 hover:text-text-secondary transition-colors cursor-pointer"
        >
          <kbd className="rounded bg-background-secondary-default/80 border border-border-button-default/50 px-1.5 py-0.2 font-mono text-[10px] text-text-secondary font-medium">/</kbd>
          <span>动作命令</span>
        </button>
        <span className="text-text-tertiary/40">•</span>
        <button
          type="button"
          onClick={() => handleTriggerShortcut("cmd-l")}
          className="inline-flex items-center gap-1 hover:text-text-secondary transition-colors cursor-pointer"
        >
          <kbd className="rounded bg-background-secondary-default/80 border border-border-button-default/50 px-1.5 py-0.2 font-mono text-[10px] text-text-secondary font-medium">⌘L</kbd>
          <span>全局检索</span>
        </button>
      </div>
    </div>
  )
}
