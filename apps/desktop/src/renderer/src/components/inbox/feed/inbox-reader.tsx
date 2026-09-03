/**
 * 右侧阅读器：选中消息的标题、元信息、正文与跳转，不要再包一层卡片。
 */
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useT } from "@renderer/i18n"
import type { InboxNotification } from "../inbox.types"
import { inboxGlyph } from "../lib/inbox-glyph"
import { inboxCategoryLabel, inboxTimeLabel } from "./inbox-copy"

export function InboxReader(props: {
  item: InboxNotification | null
  now: number
  onToggleRead: (id: string) => void
  onOpenAction: (item: InboxNotification) => void
}) {
  const t = useT()
  const { item, now, onToggleRead, onOpenAction } = props

  if (!item) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 items-start px-8 py-10">
        <div>
          <p className="text-body-medium text-text-secondary">{t("pages.inbox.readerEmpty")}</p>
          <p className="mt-1 text-caption-1-regular text-text-tertiary">
            {t("pages.inbox.readerEmptyHint")}
          </p>
        </div>
      </div>
    )
  }

  const Glyph = inboxGlyph(item.copyKey)
  const kind = inboxCategoryLabel(item.category, t)
  const time = inboxTimeLabel(item.occurredAt, now, t)

  return (
    <ScrollArea className="h-full min-h-0 min-w-0 flex-1">
      <article className="mx-auto max-w-2xl px-8 py-8">
        <div className="flex items-center gap-2 text-caption-1-medium text-text-tertiary">
          <Glyph className="size-4 text-foreground-icon-tertiary" aria-hidden />
          <span>{kind}</span>
          <span aria-hidden>·</span>
          <time dateTime={new Date(item.occurredAt).toISOString()}>{time}</time>
        </div>
        <h2 className="mt-2 text-title-3-semibold text-text-primary">{item.title}</h2>
        <p className="mt-4 text-body-regular text-text-secondary">{item.summary}</p>
        <div className="mt-6 flex items-center gap-2">
          {item.actionLabel ? (
            <Button variant="outline" size="sm" onClick={() => onOpenAction(item)}>
              {item.actionLabel}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => onToggleRead(item.id)}>
            {item.read ? t("pages.inbox.markUnread") : t("pages.inbox.markRead")}
          </Button>
        </div>
      </article>
    </ScrollArea>
  )
}
