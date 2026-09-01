/**
 * 会话空状态单个 Bento 意图推荐卡片
 */
import { RiArrowRightLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { EmptyStateIntentItem } from "./empty-state.types"

interface EmptyStateCardProps {
  item: EmptyStateIntentItem
  onSelect: (prompt: string) => void
}

export function EmptyStateCard({ item, onSelect }: EmptyStateCardProps) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={() => onSelect(item.prompt)}
      className={cx(
        "group relative flex flex-col justify-between p-4 text-left",
        "rounded-2xl border border-border-button-default/60 bg-background-secondary-default/40",
        "hover:border-accent-500/40 hover:bg-background-secondary-default/90 hover:shadow-card",
        "active:scale-[0.99] transition-all duration-200 cursor-pointer outline-none",
        "focus-visible:border-border-focus-ring focus-visible:ring-2 focus-visible:ring-accent-500/20"
      )}
    >
      {/* 顶部：图标 + 标签 + 悬停箭头 */}
      <div className="flex items-center justify-between w-full">
        <div className="flex size-8 items-center justify-center rounded-xl border border-border-button-default/50 bg-background-primary-default text-foreground-icon-secondary shadow-2xs transition-colors group-hover:border-accent-500/30 group-hover:text-accent-500">
          <Icon className="size-4.5" aria-hidden />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-background-tertiary-default/60 px-2 py-0.5 text-caption-2-medium text-text-tertiary transition-colors group-hover:text-text-secondary">
            {item.tag}
          </span>
          <RiArrowRightLine
            className="size-4 -translate-x-1 text-text-tertiary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-accent-500 group-hover:opacity-100"
            aria-hidden
          />
        </div>
      </div>

      {/* 底部：标题与描述 */}
      <div className="mt-3.5 flex flex-col">
        <span className="text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
          {item.title}
        </span>
        <p className="mt-1 line-clamp-2 text-caption-1-regular text-text-tertiary">
          {item.description}
        </p>
      </div>
    </button>
  )
}
