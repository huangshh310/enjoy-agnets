/**
 * 看板卡片：会话名 + 项目/活动态；点开进对话。只吞拖完紧随的 click。
 */
import { useRef } from "react"
import { RiBookmarkFill } from "@remixicon/react"
import { LoadingStateGlyph } from "@/components/ai-elements/loading-state"
import { cx } from "@/utils/cx"
import { SessionAgentMark } from "@renderer/components/ai-chat/sidebar/session-agent-mark"
import { useSessionActivity } from "@renderer/components/ai-chat/sidebar/use-session-activity"
import { useT } from "@renderer/i18n"
import { shouldOpenAfterDrag, type KanbanCard } from "../logic/kanban-board.logic"

export function KanbanCardView({
  card,
  formatTime,
  onOpen
}: {
  card: KanbanCard
  formatTime: (timestamp: number) => string
  onOpen: (id: string) => void
}) {
  const dragEndedAt = useRef<number | null>(null)
  return (
    <button
      type="button"
      draggable
      data-testid={`kanban-card-${card.id}`}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/session-id", card.id)
        event.dataTransfer.effectAllowed = "move"
      }}
      onDragEnd={() => {
        dragEndedAt.current = Date.now()
      }}
      onClick={() => {
        if (!shouldOpenAfterDrag(dragEndedAt.current, Date.now())) return
        dragEndedAt.current = null
        onOpen(card.id)
      }}
      className={cx(
        "flex w-full cursor-pointer items-start gap-2 rounded-xl border border-border-button-default",
        "bg-background-primary-default px-2.5 py-2 text-left shadow-2xs",
        "hover:border-border-button-hover hover:bg-background-secondary-hover"
      )}
    >
      <SessionAgentMark sessionId={card.id} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1">
          {card.flagged ? <RiBookmarkFill className="size-3 shrink-0 text-accent-600 dark:text-accent-400" /> : null}
          <span className="block truncate text-caption-1-medium text-text-primary">{card.name}</span>
        </span>
        <KanbanCardMeta card={card} formatTime={formatTime} />
      </span>
    </button>
  )
}

function KanbanCardMeta({
  card,
  formatTime
}: {
  card: KanbanCard
  formatTime: (timestamp: number) => string
}) {
  const t = useT()
  const activity = useSessionActivity(card.id)
  const bits: string[] = []
  if (card.workspaceName) bits.push(card.workspaceName)
  if (!activity.running && !activity.waitingReview) bits.push(formatTime(card.updatedAt))
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-caption-2-regular text-text-secondary">
      {activity.waitingReview ? (
        <span className="inline-flex items-center gap-1 text-text-error-primary">
          <span className="size-1.5 rounded-full bg-text-error-primary" />
          {t("chat.kanbanWaiting")}
        </span>
      ) : activity.running ? (
        <LoadingStateGlyph variant="drive" className="shrink-0" />
      ) : null}
      {bits.length > 0 ? <span className="truncate">{bits.join(" · ")}</span> : null}
    </span>
  )
}
