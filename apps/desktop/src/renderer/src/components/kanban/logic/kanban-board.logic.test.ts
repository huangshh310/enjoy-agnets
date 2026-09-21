import assert from "node:assert/strict"
import { test } from "node:test"
import type { RepositoryNode } from "../../../stores/chat-store.types.ts"
import {
  DRAG_CLICK_GUARD_MS,
  cardsInColumn,
  columnOf,
  nextStatusForDrop,
  sessionsToKanbanCards,
  shouldOpenAfterDrag
} from "./kanban-board.logic.ts"

function session(partial: Partial<RepositoryNode> & Pick<RepositoryNode, "id" | "name">): RepositoryNode {
  return {
    kind: "session",
    updatedAt: 1,
    parentId: "ws",
    ...partial
  }
}

test("未标会话进待办列", () => {
  const cards = sessionsToKanbanCards([
    session({ id: "a", name: "未标" }),
    session({ id: "b", name: "审查", workflowStatus: "needs_review", updatedAt: 2 }),
    { id: "ws", name: "项目", kind: "workspace", updatedAt: 0 }
  ])
  assert.equal(cards.length, 2)
  assert.equal(columnOf(cards[0]!), "todo")
  assert.equal(cards[0]?.workspaceName, undefined)
  assert.deepEqual(
    cardsInColumn(cards, "needs_review").map((item) => item.id),
    ["b"]
  )
})

test("多个工作区才在卡片上写项目名", () => {
  const cards = sessionsToKanbanCards([
    { id: "ws", name: "enjoy", kind: "workspace", updatedAt: 0 },
    { id: "other", name: "synara", kind: "workspace", updatedAt: 0 },
    session({ id: "a", name: "未标", workspaceId: "ws", parentId: "ws" })
  ])
  assert.equal(cards[0]?.workspaceName, "enjoy")
})

test("同列放下不改状态", () => {
  assert.equal(nextStatusForDrop(null, "todo"), null)
  assert.equal(nextStatusForDrop("todo", "todo"), null)
  assert.equal(nextStatusForDrop("todo", "done"), "done")
  assert.equal(nextStatusForDrop(null, "in_progress"), "in_progress")
})

test("拖完只吞紧随的 click，不挡下一次打开", () => {
  assert.equal(shouldOpenAfterDrag(null, 1000), true)
  assert.equal(shouldOpenAfterDrag(1000, 1000), false)
  assert.equal(shouldOpenAfterDrag(1000, 1000 + DRAG_CLICK_GUARD_MS), false)
  assert.equal(shouldOpenAfterDrag(1000, 1000 + DRAG_CLICK_GUARD_MS + 1), true)
})
