/**
 * 对话框工具表面选择：Todo 取最后一次；diff/bash 进卡片；read 不进。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import {
  desktopActFailedSurfaces,
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

test("toolResultSurfaces 只收有 diff 的文件变更工具，终端 bash 回显保留在思考链内部", () => {
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
    ["edit"]
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

test("desktop_act action_failed 进失败表面，不当 diff", () => {
  const failed = tool({
    id: "act",
    name: "desktop_act",
    result: { success: false, code: "action_failed" }
  })
  assert.equal(hasTurnToolSurfaces([failed]), true)
  assert.equal(desktopActFailedSurfaces([failed]).length, 1)
  assert.equal(toolResultSurfaces([failed]).length, 0)
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

test("新用户轮开始后不再展示上一轮已完成的 Todo List", () => {
  const list = latestSessionTodoList([
    { role: "user" },
    {
      role: "assistant",
      tools: [
        tool({
          id: "old",
          name: "todo_write",
          result: {
            title: "Rust login logic",
            todos: [
              { title: "Inspect existing login page and project layout", status: "completed" },
              { title: "Implement Rust login logic matching the demo", status: "completed" }
            ]
          }
        })
      ]
    },
    { role: "user" },
    { role: "assistant", tools: [] }
  ])
  assert.equal(list, null)
})

test("续跑用户句不把上一轮 Todo List 藏掉", () => {
  const list = latestSessionTodoList([
    { role: "user", content: "做落地页" },
    {
      role: "assistant",
      tools: [
        tool({
          id: "plan",
          name: "todo_write",
          result: {
            title: "Stripe landing page",
            todos: [
              { title: "Inspect workspace", status: "completed" },
              { title: "Build HTML", status: "in_progress" }
            ]
          }
        })
      ]
    },
    { role: "user", content: "继续完成未完成的内容" },
    { role: "assistant", tools: [] }
  ])
  assert.equal(list?.title, "Stripe landing page")
  assert.equal(list?.tasks[1]?.status, "in_progress")
})

test("本轮 assistant 写出新表后才替换 Dock", () => {
  const list = latestSessionTodoList([
    {
      role: "assistant",
      tools: [
        tool({
          id: "old",
          name: "todo_write",
          result: { title: "Rust login logic", todos: [{ title: "Old", status: "completed" }] }
        })
      ]
    },
    { role: "user" },
    {
      role: "assistant",
      tools: [
        tool({
          id: "next",
          name: "todo_write",
          result: {
            title: "Stripe-style landing page",
            todos: [{ title: "Create Stripe-system landing page HTML", status: "in_progress" }]
          }
        })
      ]
    }
  ])
  assert.equal(list?.title, "Stripe-style landing page")
  assert.equal(list?.tasks[0]?.status, "in_progress")
})
