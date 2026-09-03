/**
 * 收件箱分栏顶栏：未读计数与轻量操作，不再重复面包屑标题。
 */
import { RiCheckDoubleLine, RiDeleteBinLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function InboxToolbar(props: {
  unreadCount: number
  hasRead: boolean
  onMarkAllRead: () => void
  onClearRead: () => void
}) {
  const t = useT()
  const { unreadCount, hasRead, onMarkAllRead, onClearRead } = props

  return (
    <header
      data-testid="page-inbox"
      className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-separator-border px-4"
    >
      <p className="text-caption-1-medium text-text-secondary">
        {unreadCount > 0
          ? t("pages.inbox.unreadCount", { n: unreadCount })
          : t("pages.inbox.allCaughtUp")}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {unreadCount > 0 ? (
          <Button variant="ghost" size="sm" className="gap-1" onClick={onMarkAllRead}>
            <RiCheckDoubleLine className="size-3.5" />
            <span>{t("pages.inbox.markAllRead")}</span>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          disabled={!hasRead}
          onClick={onClearRead}
        >
          <RiDeleteBinLine className="size-3.5" />
          <span>{t("pages.inbox.clearRead")}</span>
        </Button>
      </div>
    </header>
  )
}
