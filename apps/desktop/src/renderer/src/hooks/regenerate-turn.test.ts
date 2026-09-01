/**
 * 助手回复重新生成与用户消息编辑上下文截断逻辑单测
 */
import test from "node:test"
import assert from "node:assert/strict"
import type { ThreadMessage } from "../stores/chat-store.ts"

function truncateForRegeneration(messages: ThreadMessage[], assistantId: string): ThreadMessage[] | null {
  const targetIndex = messages.findIndex((m) => m.id === assistantId)
  if (targetIndex === -1) return null

  let userIndex = -1
  for (let i = targetIndex - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      userIndex = i
      break
    }
  }
  if (userIndex === -1) return null

  return messages.slice(0, userIndex + 1)
}

function truncateForEdit(messages: ThreadMessage[], userId: string, newText: string): ThreadMessage[] | null {
  const userIndex = messages.findIndex((m) => m.id === userId)
  if (userIndex === -1) return null

  const old = messages[userIndex]
  if (!old) return null

  const updated: ThreadMessage = {
    ...old,
    content: newText.trim(),
    createdAt: Date.now()
  }

  return [...messages.slice(0, userIndex), updated]
}

test("truncateForRegeneration 能够准确截断并保留对应用户消息", () => {
  const messages: ThreadMessage[] = [
    { id: "u1", role: "user", content: "Hello", createdAt: 1 },
    { id: "a1", role: "assistant", content: "Hi there", createdAt: 2 },
    { id: "u2", role: "user", content: "Explain quantum computing", createdAt: 3 },
    { id: "a2", role: "assistant", content: "Quantum computing is...", createdAt: 4 }
  ]

  const truncated = truncateForRegeneration(messages, "a2")
  assert.ok(truncated)
  assert.equal(truncated.length, 3) // u1, a1, u2
  assert.equal(truncated[truncated.length - 1]?.id, "u2")
  assert.equal(truncated[truncated.length - 1]?.content, "Explain quantum computing")
})

test("truncateForEdit 能够更新用户内容并丢弃后续历史", () => {
  const messages: ThreadMessage[] = [
    { id: "u1", role: "user", content: "Hello", createdAt: 1 },
    { id: "a1", role: "assistant", content: "Hi there", createdAt: 2 },
    { id: "u2", role: "user", content: "Original prompt", createdAt: 3 },
    { id: "a2", role: "assistant", content: "Old reply", createdAt: 4 }
  ]

  const edited = truncateForEdit(messages, "u2", "New modified prompt")
  assert.ok(edited)
  assert.equal(edited.length, 3) // u1, a1, updated u2
  assert.equal(edited[2]?.id, "u2")
  assert.equal(edited[2]?.content, "New modified prompt")
})
