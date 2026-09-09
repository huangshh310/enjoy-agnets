/**
 * 空态示例任务：输入框下方的命令 pill，点击填入 Composer。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { getIntentCards } from "./empty-state-constants"
import type { EmptyStateIntentItem } from "./empty-state.types"

interface EmptyStatePillsProps {
  onSelectPrompt: (prompt: string) => void
  className?: string
}

export function EmptyStatePills({ onSelectPrompt, className }: EmptyStatePillsProps) {
  const t = useT()
  const intentCards = getIntentCards(t)

  return (
    <div className={cx("flex w-full flex-col items-center gap-2", className)}>
      <p className="sr-only">{t("chat.emptySamples")}</p>
      <div className="flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {intentCards.map((item: EmptyStateIntentItem) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              title={item.description}
              className={cx(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5",
                "bg-background-secondary-default text-caption-1-medium text-text-secondary",
                "transition-colors duration-200",
                "hover:bg-background-secondary-hover hover:text-text-primary",
                "active:scale-[0.98]",
                "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              )}
            >
              <span className="inline-grid size-5 place-items-center rounded-full bg-background-primary-default">
                <Icon className="size-3 text-accent-500" aria-hidden />
              </span>
              <span>{item.shortTitle || item.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
