import assert from "node:assert/strict"
import { test } from "node:test"
import { filterArchivedChats, groupArchivedByWorkspace } from "./archived-chats.ts"

const rows = [
  {
    id: "s1",
    workspaceId: "ws-a",
    workspaceName: "enjoy-agents",
    title: "设计计划",
    updatedAt: 1,
    archivedAt: 2
  },
  {
    id: "s2",
    workspaceId: "ws-b",
    workspaceName: "img",
    title: "新对话",
    updatedAt: 3,
    archivedAt: 4
  }
]

test("按关键词与项目筛选已归档会话", () => {
  assert.equal(filterArchivedChats(rows, "设计", "all").length, 1)
  assert.equal(filterArchivedChats(rows, "", "ws-b")[0]?.id, "s2")
})

test("按工作区分组", () => {
  const groups = groupArchivedByWorkspace(rows)
  assert.equal(groups.length, 2)
  assert.equal(groups[0]?.chats.length, 1)
})
