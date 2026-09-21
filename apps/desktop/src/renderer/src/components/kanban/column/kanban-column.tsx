/**
 * 看板一列：标题、张数、拖入改状态、底部新建。
 */
import { RiAddLine } from "@remixicon/react"
import { useState, type DragEvent } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { WORKFLOW_STATUSES } from "@renderer/components/ai-chat/sidebar/session-workflow"
import { WorkflowStatusGlyph } from "@renderer/components/ai-chat/sidebar/workflow-status-glyph"
import { KanbanCardView } from "../card/kanban-card"
import type { KanbanCard, KanbanColumnId } from "../logic/kanban-board.logic"

function columnDropProps(
  column: KanbanColumnId,
  onDropSession: (sessionId: string, column: KanbanColumnId) => void,
  setOver: (over: boolean) => void
) {
  return {
    onDragOver: (event: DragEvent) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      setOver(true)
    },
    onDragLeave: (event: DragEvent) => {
      const next = event.relatedTarget
      if (next instanceof Node && event.currentTarget.contains(next)) return
      setOver(false)
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      setOver(false)
      const id = event.dataTransfer.getData("text/session-id").trim()
      if (id) onDropSession(id, column)
    }
  }
}

function ColumnNewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-2 mb-2 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
    >
      <RiAddLine className="size-3.5" aria-hidden />
      {label}
    </button>
  )
}

export function KanbanColumn({
  column,
  cards,
  formatTime,
  canCreate,
  onOpen,
  onDropSession,
  onNew
}: {
  column: KanbanColumnId
  cards: readonly KanbanCard[]
  formatTime: (timestamp: number) => string
  canCreate: boolean
  onOpen: (id: string) => void
  onDropSession: (sessionId: string, column: KanbanColumnId) => void
  onNew: (column: KanbanColumnId) => void
}) {
  const t = useT()
  const [over, setOver] = useState(false)
  return (
    <section
      data-testid={`kanban-column-${column}`}
      {...columnDropProps(column, onDropSession, setOver)}
      className={cx(
        "flex min-h-0 min-w-60 flex-1 flex-col rounded-2xl border bg-background-secondary-default/50",
        over ? "border-accent-500/40 bg-accent-500/5" : "border-transparent"
      )}
    >
      <header className="flex shrink-0 items-center gap-1.5 px-3 py-2">
        <WorkflowStatusGlyph status={column} sizeClass="size-3.5" />
        <h2 className="text-caption-1-semibold text-text-secondary">{t(WORKFLOW_STATUSES[column].labelKey)}</h2>
        <span className="ml-auto text-caption-2-regular tabular-nums text-text-tertiary">{cards.length}</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2">
        {cards.map((card) => (
          <KanbanCardView key={card.id} card={card} formatTime={formatTime} onOpen={onOpen} />
        ))}
        {cards.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-1 text-caption-2-regular text-text-tertiary">
            {t("chat.kanbanEmpty")}
          </p>
        ) : null}
      </div>
      {canCreate ? <ColumnNewButton label={t("chat.kanbanNew")} onClick={() => onNew(column)} /> : null}
    </section>
  )
}
