/**
 * 时间线行：类型图标 + 字重区分未读，选中用次级底，不要蓝点阵列。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { InboxNotification } from "../inbox.types"
import { inboxGlyph } from "../lib/inbox-glyph"
import { inboxCategoryLabel, inboxTimeLabel } from "./inbox-copy"

export function InboxRow(props: {
  item: InboxNotification
  selected: boolean
  now: number
  onSelect: (item: InboxNotification) => void
}) {
  const t = useT()
  const { item, selected, now, onSelect } = props
  const Glyph = inboxGlyph(item.copyKey)
  const time = inboxTimeLabel(item.occurredAt, now, t)
  const kind = inboxCategoryLabel(item.category, t)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-current={selected ? "true" : undefined}
        className={cx(
          "group flex w-full gap-2.5 px-3 py-2.5 text-left outline-none transition-all duration-200 rounded-xl",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring",
          selected
            ? "bg-background-secondary-default shadow-2xs"
            : "hover:bg-background-secondary-hover/60"
        )}
      >
        <Glyph
          className={cx(
            "mt-0.5 size-4 shrink-0",
            item.read ? "text-foreground-icon-quaternary" : "text-foreground-icon-secondary"
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              {!item.read ? (
                <span className="relative flex size-1.5 shrink-0 self-center">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-400 opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-accent-500" />
                </span>
              ) : null}
              <span
                className={cx(
                  "min-w-0 truncate",
                  item.read
                    ? "text-caption-1-medium text-text-secondary"
                    : "text-caption-1-semibold text-text-primary"
                )}
              >
                {item.title}
              </span>
            </span>
            <time
              className="shrink-0 text-caption-2-regular text-text-tertiary"
              dateTime={new Date(item.occurredAt).toISOString()}
            >
              {time}
            </time>
          </span>
          <span className="mt-0.5 line-clamp-1 text-caption-2-regular text-text-tertiary">
            {kind}
            <span className="px-1">·</span>
            {item.summary}
          </span>
        </span>
      </button>
    </li>
  )
}
