/**
 * 左侧时间线：日期只做 caption，不要灰条表格头，不要再套一层圆角卡片。
 */
import { ScrollArea } from "@/components/ui/scroll-area"
import { useT } from "@renderer/i18n"
import type { InboxGroup, InboxNotification } from "../inbox.types"
import { inboxGroupLabel } from "./inbox-copy"
import { InboxEmpty } from "./inbox-empty"
import { InboxRow } from "./inbox-row"

export function InboxFeed(props: {
  groups: InboxGroup[]
  selectedId: string | null
  now: number
  onSelect: (item: InboxNotification) => void
}) {
  const t = useT()
  const { groups, selectedId, now, onSelect } = props

  if (groups.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-[22rem] shrink-0 flex-col border-r border-separator-border">
        <div className="p-4">
          <InboxEmpty />
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full min-h-0 w-[22rem] shrink-0 border-r border-separator-border bg-background-secondary-default/30">
      {groups.map((group) => (
        <section key={group.id}>
          <h2 className="px-3 pb-1 pt-3 text-caption-2-medium text-text-tertiary">
            {inboxGroupLabel(group.id, t)}
          </h2>
          <ul>
            {group.items.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                now={now}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      ))}
    </ScrollArea>
  )
}
