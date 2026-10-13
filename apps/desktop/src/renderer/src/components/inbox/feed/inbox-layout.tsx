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
  approvalCount: number
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
    // 窄（页宽 < 36rem：440 宽，或 733 宽开着侧栏）改上下叠：列表在上限高，详情占满宽，不再横向溢出（luna 5042）。
    <div data-testid="inbox-layout" className="@container/inbox h-full min-h-0 min-w-0">
    <div className="flex h-full min-h-0 min-w-0 overflow-hidden @max-[36rem]/inbox:flex-col">
      {/* 左侧列表栏 */}
      <div className="@container/inbox-list flex h-full min-h-0 w-[45%] min-w-[13rem] max-w-[24rem] xl:max-w-[26rem] shrink-0 flex-col border-r border-separator-border/70 bg-background-secondary-default/20 @max-[36rem]/inbox:h-auto @max-[36rem]/inbox:max-h-[40%] @max-[36rem]/inbox:w-full @max-[36rem]/inbox:min-w-0 @max-[36rem]/inbox:max-w-none @max-[36rem]/inbox:border-r-0 @max-[36rem]/inbox:border-b">
        <InboxToolbar
          approvalCount={props.approvalCount}
          unreadCount={props.unreadCount}
          hasRead={props.hasRead}
          onMarkAllRead={props.onMarkAllRead}
          onClearRead={props.onClearRead}
        />
        <InboxFeed
          groups={groups}
          selectedId={selected?.id ?? null}
          now={now}
          onSelect={props.onSelect}
        />
      </div>

      {/* 右侧详情阅读器 */}
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
