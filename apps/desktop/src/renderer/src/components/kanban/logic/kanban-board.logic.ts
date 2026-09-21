/**
 * 看板列：会话 workflowStatus 投影。未标的进待办。
 */
import type { SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"
import type { RepositoryNode } from "../../../stores/chat-store.types.ts"

export const KANBAN_COLUMNS = ["todo", "in_progress", "needs_review", "done"] as const
export type KanbanColumnId = (typeof KANBAN_COLUMNS)[number]

/** 拖完若跟一次 click，只吞这一小段窗口内的，不要挡住下一次点开。 */
export const DRAG_CLICK_GUARD_MS = 80

export type KanbanCard = {
  id: string
  name: string
  updatedAt: number
  workspaceId?: string
  /** 多个工作区才填，避免单项目看板重复项目名。 */
  workspaceName?: string
  workflowStatus: SessionWorkflowStatus | null
  flagged?: boolean
}

/**
 * 把会话树压成看板卡片。工作区节点只用来填项目名。
 */
export function sessionsToKanbanCards(nodes: readonly RepositoryNode[]): KanbanCard[] {
  const workspaceNames = new Map<string, string>()
  let workspaceCount = 0
  for (const node of nodes) {
    if (node.kind !== "workspace") continue
    workspaceCount += 1
    workspaceNames.set(node.id, node.name)
  }
  const showWorkspace = workspaceCount > 1
  return nodes
    .filter((node) => node.kind === "session")
    .map((node) => {
      const workspaceId = node.workspaceId ?? node.parentId
      return {
        id: node.id,
        name: node.name,
        updatedAt: node.updatedAt,
        workspaceId,
        workspaceName: showWorkspace && workspaceId ? workspaceNames.get(workspaceId) : undefined,
        workflowStatus: node.workflowStatus ?? null,
        flagged: node.flagged
      }
    })
}

export function cardsInColumn(cards: readonly KanbanCard[], column: KanbanColumnId): KanbanCard[] {
  return cards
    .filter((card) => columnOf(card) === column)
    .sort((left, right) => right.updatedAt - left.updatedAt)
}

export function columnOf(card: KanbanCard): KanbanColumnId {
  return card.workflowStatus ?? "todo"
}

/** 同列放下返回 null，调用方不要写盘。 */
export function nextStatusForDrop(
  current: SessionWorkflowStatus | null | undefined,
  column: KanbanColumnId
): SessionWorkflowStatus | null {
  const currentColumn = current ?? "todo"
  return currentColumn === column ? null : column
}

export function shouldOpenAfterDrag(dragEndedAt: number | null, now: number): boolean {
  if (dragEndedAt == null) return true
  return now - dragEndedAt > DRAG_CLICK_GUARD_MS
}
