import { RiFolderLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { InboxNotification } from "../inbox.types"
import { getInboxTheme, inboxTimeLabel } from "./inbox-copy"

export function InboxRow(props: {
  item: InboxNotification
  selected: boolean
  now: number
  onSelect: (item: InboxNotification) => void
}) {
  const t = useT()
  const { item, selected, now, onSelect } = props
  const theme = getInboxTheme(item.copyKey, t)
  const ThemeIcon = theme.icon
  const time = inboxTimeLabel(item.occurredAt, now, t)
  const displayTitle = item.sessionTitle || item.title || t("chat.untitledSession")
  const snippet = item.errorMessage || item.summary

  return (
    <li className="px-2 py-0.5">
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-current={selected ? "true" : undefined}
        className={cx(
          "group flex w-full flex-col gap-1.5 rounded-2xl border p-3.5 text-left outline-none transition-all duration-150 cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-1",
          selected
            ? "border-border-button-default bg-background-primary-default shadow-xs ring-1 ring-accent-500/25"
            : "border-separator-border/40 bg-background-primary-default/50 hover:border-separator-border/80 hover:bg-background-primary-default hover:shadow-2xs"
        )}
      >
        {/* 顶部：状态徽标 + 工作区 + 未读指示 + 发生时间 */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {!item.read ? (
              <span className="size-2 shrink-0 rounded-full bg-accent-500 shadow-xs" />
            ) : null}
            <span
              className={cx(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium border shrink-0",
                theme.badgeBg,
                theme.badgeText,
                theme.badgeBorder
              )}
            >
              <ThemeIcon className="size-3 shrink-0" />
              <span>{theme.badgeLabel}</span>
            </span>
            {item.workspaceName ? (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] text-text-quaternary bg-background-secondary-default/70 border border-separator-border/30 truncate max-w-[110px]"
                title={item.workspaceName}
              >
                <RiFolderLine className="size-2.5 shrink-0" />
                <span className="truncate">{item.workspaceName}</span>
              </span>
            ) : null}
          </div>

          <time
            className="shrink-0 text-[11px] text-text-tertiary font-mono"
            dateTime={new Date(item.occurredAt).toISOString()}
          >
            {time}
          </time>
        </div>

        {/* 中间：会话名称 / 标题 */}
        <div className="min-w-0">
          <h4
            className={cx(
              "truncate text-caption-1-medium tracking-tight",
              item.read ? "text-text-secondary" : "font-semibold text-text-primary"
            )}
          >
            {displayTitle}
          </h4>
        </div>

        {/* 底部：摘要或错误片段 */}
        {snippet ? (
          <p className="line-clamp-2 text-[12px] text-text-tertiary leading-relaxed">
            {snippet}
          </p>
        ) : null}
      </button>
    </li>
  )
}
