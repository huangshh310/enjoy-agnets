/**
 * 收件箱分栏：顶栏 + 时间线 + 阅读器，铺满二级页 fill 高度。
 */
import type { InboxGroup, InboxNotification } from "../inbox.types"
import { InboxFeed } from "./inbox-feed"
import { InboxReader } from "./inbox-reader"
import { InboxToolbar } from "./inbox-toolbar"

export function InboxLayout(props: {
  groups: InboxGroup[]
  selected: InboxNotification | null
  now: number
  unreadCount: number
  hasRead: boolean
  onSelect: (item: InboxNotification) => void
  onToggleRead: (id: string) => void
  onOpenAction: (item: InboxNotification) => void
  onMarkAllRead: () => void
  onClearRead: () => void
}) {
  const { groups, selected, now } = props

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InboxToolbar
        unreadCount={props.unreadCount}
        hasRead={props.hasRead}
        onMarkAllRead={props.onMarkAllRead}
        onClearRead={props.onClearRead}
      />
      <div className="flex min-h-0 flex-1">
        <InboxFeed
          groups={groups}
          selectedId={selected?.id ?? null}
          now={now}
          onSelect={props.onSelect}
        />
        <InboxReader
          item={selected}
          now={now}
          onToggleRead={props.onToggleRead}
          onOpenAction={props.onOpenAction}
        />
      </div>
    </div>
  )
}
