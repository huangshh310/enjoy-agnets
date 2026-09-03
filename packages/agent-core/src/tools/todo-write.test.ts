/**
 * todo_write 只维护对话任务板，不写盘。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { normalizeTodoWrite } from "./todo-write.ts"

test("normalizeTodoWrite 填 id、归一状态、丢掉空标题", () => {
  const result = normalizeTodoWrite({
    title: " Release plan ",
    todos: [
      { title: "Inspect checkout", status: "done" },
      { title: "Write patch", status: "in-progress" },
      { id: "t3", title: "Collect approval", status: "pending" },
      { title: "   " }
    ]
  })
  assert.equal(result.title, "Release plan")
  assert.equal(result.todos.length, 3)
  assert.equal(result.todos[0]?.id, "todo_1")
  assert.equal(result.todos[0]?.status, "completed")
  assert.equal(result.todos[1]?.status, "in_progress")
  assert.equal(result.todos[2]?.id, "t3")
})

test("normalizeTodoWrite 无标题时不下发空字符串", () => {
  const result = normalizeTodoWrite({
    todos: [{ title: "One" }]
  })
  assert.equal(result.title, undefined)
  assert.equal(result.todos[0]?.status, "pending")
})
