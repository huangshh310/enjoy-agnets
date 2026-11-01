/**
 * 任务栈诚实态文案：折叠头与行标签。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { stackRowStatusLabel, stackedTasksLabel } from "./composer-task-stack-copy.ts"

const zh = (key: string, params?: Record<string, string | number>) => {
  if (key === "chat.stackedTasksProgress") return `${params?.done}/${params?.total} 项已完成`
  if (key === "chat.taskFailed") return "失败"
  if (key === "chat.taskStopped") return "已停止"
  return key
}

test("stackedTasksLabel 折叠头带失败与已停止计数", () => {
  assert.equal(
    stackedTasksLabel(zh, 2, 5, { failed: 1, stopped: 2 }),
    "2/5 项已完成 · 1 失败 · 2 已停止"
  )
})

test("stackRowStatusLabel：failed / cancelled / in_progress!live", () => {
  assert.equal(stackRowStatusLabel(zh, "failed", false), "失败")
  assert.equal(stackRowStatusLabel(zh, "cancelled", false), "已停止")
  assert.equal(stackRowStatusLabel(zh, "in_progress", false), "已停止")
  assert.equal(stackRowStatusLabel(zh, "in_progress", true), null)
  assert.equal(stackRowStatusLabel(zh, "pending", false), null)
})
