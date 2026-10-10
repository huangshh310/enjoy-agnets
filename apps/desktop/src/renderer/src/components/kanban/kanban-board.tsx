/**
 * Chat 舞台看板：四列会话状态，拖入调用 session.patch。
 */
import { useNavigate } from "@tanstack/react-router"
import { getIde, hasIde } from "@renderer/lib/ide"
import { createAndOpenSession } from "@renderer/hooks/session-lifecycle"
import { selectPersistedSession } from "@renderer/hooks/use-agent-session"
import { formatNodeTime, useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { KanbanColumn } from "./column/kanban-column"
import type { RepositoryNode } from "@renderer/stores/chat-store.types"
import type { SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"
import {
  KANBAN_COLUMNS,
  cardsInColumn,
  nextStatusForDrop,
  sessionsToKanbanCards,
  type KanbanColumnId
} from "./logic/kanban-board.logic"

type PatchSession = (id: string, patch: { workflowStatus: SessionWorkflowStatus | null }) => void

async function dropSession(
  sessionId: string,
  column: KanbanColumnId,
  repositories: readonly RepositoryNode[],
  patchSessionNode: PatchSession
) {
  const previous = repositories.find((node) => node.id === sessionId)?.workflowStatus ?? null
  const next = nextStatusForDrop(previous, column)
  if (!next) return
  patchSessionNode(sessionId, { workflowStatus: next })
  if (!hasIde()) return
  try {
    await getIde().session.patch({ id: sessionId, workflowStatus: next })
  } catch {
    patchSessionNode(sessionId, { workflowStatus: previous })
  }
}

async function newInColumn(
  column: KanbanColumnId,
  workspaceId: string | null,
  title: string,
  patchSessionNode: PatchSession
) {
  if (!workspaceId) return
  await createAndOpenSession(workspaceId, title)
  const state = useChatStore.getState()
  if (!state.sessionId) return
  await dropSession(state.sessionId, column, state.repositories, patchSessionNode)
}

export function KanbanBoard() {
  const t = useT()
  const navigate = useNavigate()
  const repositories = useChatStore((state) => state.repositories)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const patchSessionNode = useChatStore((state) => state.patchSessionNode)
  const cards = sessionsToKanbanCards(repositories)
  const runningCount = cardsInColumn(cards, "in_progress").length
  const reviewCount = cardsInColumn(cards, "needs_review").length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3 pb-4" data-testid="kanban-board">
      <header className="shrink-0">
        <h1 className="text-title-3-semibold text-text-primary">{t("chat.kanbanTitle")}</h1>
        <p className="mt-0.5 text-caption-1-medium text-text-secondary">
          {runningCount > 0 || reviewCount > 0
            ? t("chat.kanbanActiveHint", { running: runningCount, review: reviewCount })
            : t("chat.kanbanHint")}
        </p>
      </header>
      {/* overflow-x 会把 overflow-y 也收成裁剪；列高亮必须画在盒子里，再留 2px 不贴边。 */}
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="flex h-full min-h-0 min-w-full gap-3 p-0.5">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column}
              column={column}
              cards={cardsInColumn(cards, column)}
              formatTime={(timestamp) => formatNodeTime(timestamp, t)}
              canCreate={Boolean(workspaceId)}
              onOpen={(id) => {
                void selectPersistedSession(id)
                void navigate({ to: "/" })
              }}
              onDropSession={(id, next) =>
                void dropSession(id, next, repositories, patchSessionNode)
              }
              onNew={(next) => void newInColumn(next, workspaceId, t("chat.newAgent"), patchSessionNode)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
