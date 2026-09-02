import assert from "node:assert/strict"
import { test } from "node:test"
import { threadToRawMessages } from "./raw-thread-messages.ts"

test("threadToRawMessages does not invent a system prompt", () => {
  const rows = threadToRawMessages([
    { role: "user", content: "hi" },
    { role: "assistant", content: "ok" }
  ])
  assert.equal(rows.length, 2)
  assert.deepEqual(
    rows.map((row) => row.role),
    ["user", "assistant"]
  )
})

test("threadToRawMessages puts reasoning before text like toModelMessages", () => {
  const [row] = threadToRawMessages([
    { role: "assistant", content: "你好！", reasoning: "先打招呼" }
  ])
  assert.deepEqual(row?.content, [
    { type: "reasoning", text: "先打招呼" },
    { type: "text", text: "你好！" }
  ])
})
