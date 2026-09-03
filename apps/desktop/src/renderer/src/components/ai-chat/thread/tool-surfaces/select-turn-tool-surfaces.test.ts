/**
 * 对话框工具表面选择：Todo 取最后一次；diff/bash 进卡片；read 不进。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import {
  hasTurnToolSurfaces,
  latestSessionTodoList,
  latestTodoList,
  toolResultSurfaces
} from "./select-turn-tool-surfaces.ts"

function tool(partial: Partial<ThreadToolCall> & Pick<ThreadToolCall, "id" | "name">): ThreadToolCall {
  return {
    state: "output-available",
    ...partial
  }
}

test("latestTodoList 用最后一次 todo_write，流式 args 也能画", () => {
  const list = latestTodoList([
    tool({
      id: "a",
      name: "todo_write",
      result: { todos: [{ title: "Old", status: "completed" }] }
    }),
    tool({
      id: "b",
      name: "todo_write",
      state: "input-available",
      args: {
        title: "Release plan",
        todos: [
          { title: "Inspect", status: "completed" },
          { title: "Patch", status: "in_progress" }
        ]
      }
    })
  ])
  assert.equal(list?.title, "Release plan")
  assert.equal(list?.tasks.length, 2)
  assert.equal(list?.tasks[1]?.status, "in_progress")
})

test("toolResultSurfaces 只收有 diff 或终端输出的完成工具", () => {
  const surfaces = toolResultSurfaces([
    tool({ id: "read", name: "read_file", result: { path: "a.ts", content: "export {}" } }),
    tool({
      id: "edit",
      name: "edit_file",
      result: { path: "a.ts", diff: "--- a\n+++ b\n", additions: 1, deletions: 0 }
    }),
    tool({
      id: "run",
      name: "bash",
      result: { command: "pnpm test", stdout: "ok\n", stderr: "", exitCode: 0 }
    }),
    tool({
      id: "empty",
      name: "bash",
      result: { command: "true", stdout: "", stderr: "", exitCode: 0 }
    }),
    tool({
      id: "todo",
      name: "todo_write",
      result: { todos: [{ title: "A", status: "pending" }] }
    })
  ])
  assert.deepEqual(
    surfaces.map((item) => item.id),
    ["edit", "run"]
  )
})

test("hasTurnToolSurfaces 仅有 todo 时为假，diff 才进气泡", () => {
  assert.equal(
    hasTurnToolSurfaces([
      tool({
        id: "t",
        name: "todo_write",
        result: { todos: [{ title: "Plan", status: "pending" }] }
      })
    ]),
    false
  )
  assert.equal(
    hasTurnToolSurfaces([
      tool({
        id: "edit",
        name: "edit_file",
        result: { path: "a.ts", diff: "--- a\n+++ b\n" }
      })
    ]),
    true
  )
})

test("latestSessionTodoList 取会话最后一份非空任务表", () => {
  const list = latestSessionTodoList([
    {
      tools: [
        tool({
          id: "old",
          name: "todo_write",
          result: { todos: [{ title: "Old", status: "completed" }] }
        })
      ]
    },
    { tools: [tool({ id: "read", name: "read_file", result: { path: "a.ts", content: "x" } })] },
    {
      tools: [
        tool({
          id: "new",
          name: "todo_write",
          result: {
            title: "Rust login logic",
            todos: [{ title: "Implement", status: "in_progress" }]
          }
        })
      ]
    }
  ])
  assert.equal(list?.title, "Rust login logic")
  assert.equal(list?.tasks[0]?.title, "Implement")
})
