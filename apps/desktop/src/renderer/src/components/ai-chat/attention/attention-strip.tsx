/**
 * L1：需处理条占标题栏下一行，不盖会话题、不盖用户气泡。
 * 已完成胶囊进顶栏状态区，约 4s 自消。
 */
import { RiCloseLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { AttentionChip } from "./attention-chip"
import { useAttentionStrip } from "./use-attention-strip"

export function AttentionNeedsBar() {
  const t = useT()
  const { needsItems, needs, now, dismissAll, dismissOne, openItem, compactFor } = useAttentionStrip()
  if (needsItems.length === 0) return null

  return (
    <div
      data-testid="attention-needs-bar"
      className="relative z-20 shrink-0 px-4 pb-1 pt-0.5"
    >
      <div
        role="region"
        aria-label={t("attention.stripLabel")}
        className={cx(
          "flex h-9 max-w-full items-center gap-2 rounded-full",
          "border border-border-button-default/80 bg-background-primary-default/95 px-3 py-1 shadow-card backdrop-blur-md",
          "animate-in fade-in-50 duration-200"
        )}
      >
        {needs > 0 ? (
          <span className="flex shrink-0 items-center gap-1.5 text-caption-2-medium text-text-secondary">
            <span className="size-1.5 rounded-full bg-status-yellow-text animate-pulse" />
            {t("attention.stripCount", { n: needs })}
          </span>
        ) : null}
        {needs > 0 ? <span className="h-3.5 w-px shrink-0 bg-separator-border" /> : null}
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {needsItems.map((item) => (
            <AttentionChip
              key={item.id}
              item={item}
              now={now}
              compact={compactFor(item)}
              onOpen={openItem}
              onDismiss={(target) => {
                dismissOne(target.id)
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => dismissAll(needsItems)}
          title={t("attention.dismiss")}
          aria-label={t("attention.dismiss")}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-background-tertiary-default hover:text-text-primary"
        >
          <RiCloseLine className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export function AttentionCompleteStatus() {
  const t = useT()
  const { completeItems, now, dismissOne, openItem, compactFor } = useAttentionStrip()
  if (completeItems.length === 0) return null

  return (
    <div
      data-testid="attention-complete-status"
      role="status"
      aria-label={t("attention.kind.complete")}
      className="flex max-w-56 shrink-0 items-center gap-1.5"
    >
      {completeItems.map((item) => (
        <AttentionChip
          key={item.id}
          item={item}
          now={now}
          compact={compactFor(item)}
          onOpen={openItem}
          onDismiss={(target) => {
            dismissOne(target.id)
          }}
        />
      ))}
    </div>
  )
}
