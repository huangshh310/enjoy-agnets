import assert from "node:assert/strict"
import { test } from "node:test"
import {
  dropTrailingContinueTurns,
  isTodoContinueUserMessage
} from "./todo-continue-message.ts"

test("识别中英续跑提示，不当成新任务", () => {
  assert.equal(
    isTodoContinueUserMessage(
      "继续完成 Todo List 里未完成的项。直接用 write_file / edit_file，不要再只写计划。"
    ),
    true
  )
  assert.equal(isTodoContinueUserMessage("继续完成未完成的内容"), true)
  assert.equal(
    isTodoContinueUserMessage(
      "The Todo List still has unfinished items. Continue the in_progress task now with tools."
    ),
    true
  )
  assert.equal(isTodoContinueUserMessage("按 Stripe 做落地页"), false)
})

test("丢掉末尾续跑用户句和空助手轮", () => {
  const kept = dropTrailingContinueTurns([
    { role: "user", content: "做落地页" },
    { role: "assistant", content: "计划", tools: [{ name: "todo_write" }] },
    { role: "user", content: "继续完成未完成的内容" },
    { role: "assistant", content: "", tools: [] }
  ])
  assert.equal(kept.length, 2)
  assert.equal(kept[1]?.role, "assistant")
})
