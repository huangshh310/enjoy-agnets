/**
 * 空态 3 条示例任务 pill，点击填入 Composer。
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
    <div className={cx("flex w-full flex-col items-start gap-2", className)}>
      <p className="text-caption-2-medium text-text-tertiary">{t("chat.emptySamples")}</p>
      <div className="flex max-w-xl flex-wrap items-center justify-start gap-2">
        {intentCards.map((item: EmptyStateIntentItem) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              title={item.description}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
                "border border-border-button-default bg-background-secondary-default",
                "text-caption-1-medium text-text-secondary",
                "hover:border-accent-500/40 hover:text-text-primary",
                "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              )}
            >
              <Icon className="size-3.5 text-text-tertiary" aria-hidden />
              <span>{item.shortTitle || item.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
