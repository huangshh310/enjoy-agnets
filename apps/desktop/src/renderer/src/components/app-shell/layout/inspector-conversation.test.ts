import assert from "node:assert/strict"
import { test } from "node:test"
import { isConversationSurface } from "./inspector-conversation.ts"

test("只有对话线程算审查栏表面", () => {
  assert.equal(isConversationSurface(true, "/"), true)
  assert.equal(isConversationSurface(true, "/kanban"), false)
  assert.equal(isConversationSurface(true, "/automations"), false)
  assert.equal(isConversationSurface(false, "/settings/general"), false)
  assert.equal(isConversationSurface(false, "/"), false)
})
