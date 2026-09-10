import assert from "node:assert/strict"
import { test } from "node:test"
import { insertMentionTrigger } from "./insert-mention-trigger.ts"

test("在光标处插入 @，前面补空格", () => {
  assert.deepEqual(insertMentionTrigger("看看", 2, "@"), { text: "看看 @", cursor: 4 })
  assert.deepEqual(insertMentionTrigger("", 0, "/"), { text: "/", cursor: 1 })
  assert.deepEqual(insertMentionTrigger("a @", 3, "@"), { text: "a @", cursor: 3 })
})
