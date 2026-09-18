import assert from "node:assert/strict"
import { test } from "node:test"
import { searchThreadMessages } from "./search-thread-messages.ts"

test("少于 2 个字符不搜", () => {
  assert.deepEqual(
    searchThreadMessages([{ id: "1", role: "user", content: "hello world" }], "h"),
    []
  )
})

test("最近的在前，截预览", () => {
  const hits = searchThreadMessages(
    [
      { id: "u1", role: "user", content: "fix the login form" },
      { id: "a1", role: "assistant", content: "I will patch login.tsx" },
      { id: "u2", role: "user", content: "also login tests" }
    ],
    "login"
  )
  assert.deepEqual(
    hits.map((hit) => hit.id),
    ["u2", "a1", "u1"]
  )
})
