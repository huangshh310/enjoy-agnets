import assert from "node:assert/strict"
import { test } from "node:test"
import { hasOpenTodosFromTools, shouldContinueOpenTodos } from "./todo-open.ts"

test("没有 todo_write 不当成未完成", () => {
  assert.equal(hasOpenTodosFromTools([{ name: "read_file", result: { path: "a.ts" } }]), false)
  assert.equal(hasOpenTodosFromTools([]), false)
})

test("最后一份表里还有 pending / in_progress 就要续跑", () => {
  assert.equal(
    hasOpenTodosFromTools([
      {
        name: "todo_write",
        result: {
          todos: [
            { title: "Inspect", status: "completed" },
            { title: "Build HTML", status: "in_progress" },
            { title: "Wire nav", status: "pending" }
          ]
        }
      }
    ]),
    true
  )
})

test("全部 completed 不再续跑", () => {
  assert.equal(
    hasOpenTodosFromTools([
      {
        name: "todo_write",
        result: { todos: [{ title: "Done", status: "completed" }] }
      }
    ]),
    false
  )
})

test("以最后一次 todo_write 为准", () => {
  assert.equal(
    hasOpenTodosFromTools([
      {
        name: "todo_write",
        result: { todos: [{ title: "Old", status: "in_progress" }] }
      },
      {
        name: "todo_write",
        result: { todos: [{ title: "New", status: "completed" }] }
      }
    ]),
    false
  )
})

const openTools = [
  {
    name: "todo_write",
    result: {
      todos: [
        { title: "Inspect", status: "completed" },
        { title: "Build HTML", status: "in_progress" }
      ]
    }
  }
]

test("未完成 Todo 且未达续跑上限时继续", () => {
  assert.equal(
    shouldContinueOpenTodos({ aborted: false, todoContinues: 0, tools: openTools }),
    true
  )
})

test("只有 pending、没有 in_progress 不自动续，避免误泵", () => {
  assert.equal(
    shouldContinueOpenTodos({
      aborted: false,
      todoContinues: 0,
      tools: [
        {
          name: "todo_write",
          result: { todos: [{ title: "Later", status: "pending" }] }
        }
      ]
    }),
    false
  )
})

test("用户中止或已续跑两次则不再自动续", () => {
  assert.equal(
    shouldContinueOpenTodos({ aborted: true, todoContinues: 0, tools: openTools }),
    false
  )
  assert.equal(
    shouldContinueOpenTodos({ aborted: false, todoContinues: 2, tools: openTools }),
    false
  )
})
