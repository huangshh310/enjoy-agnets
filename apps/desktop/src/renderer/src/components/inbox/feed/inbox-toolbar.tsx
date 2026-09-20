/**
 * 收件箱分栏顶栏：未读计数与轻量操作，不再重复面包屑标题。
 */
import { RiCheckDoubleLine, RiDeleteBinLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function InboxToolbar(props: {
  approvalCount: number
  unreadCount: number
  hasRead: boolean
  onMarkAllRead: () => void
  onClearRead: () => void
}) {
  const t = useT()
  const { approvalCount, unreadCount, hasRead, onMarkAllRead, onClearRead } = props

  return (
    <header
      data-testid="page-inbox"
      className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-separator-border/70 px-4 bg-background-primary-default/50"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-caption-1-semibold text-text-primary truncate">
          {t("pages.inbox.title")}
        </span>
        {approvalCount > 0 ? (
          <span
            className="inline-flex items-center rounded-full bg-accent-500 px-1.5 py-px text-[10px] font-semibold text-text-white"
            title={t("pages.inbox.approvalBadgeTitle")}
          >
            {approvalCount}
          </span>
        ) : null}
        <span className="text-[10px] text-text-tertiary">{t("pages.inbox.quietHint")}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-caption-2-medium gap-1 text-text-secondary hover:text-text-primary"
            onClick={onMarkAllRead}
            title={t("pages.inbox.markAllRead")}
          >
            <RiCheckDoubleLine className="size-3.5" />
            <span className="hidden sm:inline">{t("pages.inbox.markAllRead")}</span>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-caption-2-medium gap-1 text-text-secondary hover:text-text-primary"
          disabled={!hasRead}
          onClick={onClearRead}
          title={t("pages.inbox.clearRead")}
        >
          <RiDeleteBinLine className="size-3.5" />
          <span className="hidden sm:inline">{t("pages.inbox.clearRead")}</span>
        </Button>
      </div>
    </header>
  )
}
