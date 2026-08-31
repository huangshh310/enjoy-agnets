import assert from "node:assert/strict"
import { test } from "node:test"
import { ensureAssistantReasoning, toModelMessages } from "./to-model-messages.ts"

test("assistant reasoning becomes a reasoning part before text", () => {
  const [message] = toModelMessages([
    { role: "user", content: "你好" },
    { role: "assistant", content: "你好！", reasoning: "先打招呼" }
  ])
  assert.equal(message?.role, "user")
  const assistant = toModelMessages([
    { role: "assistant", content: "你好！", reasoning: "先打招呼" }
  ])[0]
  assert.deepEqual(assistant, {
    role: "assistant",
    content: [
      { type: "reasoning", text: "先打招呼" },
      { type: "text", text: "你好！" }
    ]
  })
})

test("ensureAssistantReasoning prepends a missing reasoning part", () => {
  const next = ensureAssistantReasoning(
    [{ role: "assistant", content: "你好" }] as never,
    "先看一眼"
  )
  assert.deepEqual(next.at(-1), {
    role: "assistant",
    content: [
      { type: "reasoning", text: "先看一眼" },
      { type: "text", text: "你好" }
    ]
  })
})

test("user and empty-reasoning assistant stay plain text", () => {
  const messages = toModelMessages([
    { role: "user", content: "hi" },
    { role: "assistant", content: "ok", reasoning: "   " }
  ])
  assert.deepEqual(messages, [
    { role: "user", content: "hi" },
    { role: "assistant", content: "ok" }
  ])
})
