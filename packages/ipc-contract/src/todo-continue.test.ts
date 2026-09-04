import assert from "node:assert/strict"
import { test } from "node:test"
import { isTodoContinueUserMessage, TODO_CONTINUE_PROMPT } from "./todo-continue.ts"

test("续跑提示句命中，普通任务句不命中", () => {
  assert.equal(isTodoContinueUserMessage(TODO_CONTINUE_PROMPT), true)
  assert.equal(isTodoContinueUserMessage("继续完成未完成的内容"), true)
  assert.equal(isTodoContinueUserMessage("按 Stripe 做落地页"), false)
  assert.equal(isTodoContinueUserMessage(""), false)
})
