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
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="p-6">
          <InboxEmpty />
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="flex flex-col gap-3 p-1.5 pb-6">
        {groups.map((group) => (
          <section key={group.id} className="flex flex-col">
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <span className="text-[11px] font-semibold tracking-wider text-text-tertiary">
                {inboxGroupLabel(group.id, t)}
              </span>
              <span className="text-[10px] font-mono text-text-quaternary">
                {group.items.length}
              </span>
            </div>
            <ul className="flex flex-col gap-0.5">
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
      </div>
    </ScrollArea>
  )
}
