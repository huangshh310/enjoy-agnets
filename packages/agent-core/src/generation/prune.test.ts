import assert from "node:assert/strict"
import { test } from "node:test"
import { clipHistory, pruneModelMessages } from "./prune.ts"

test("clipHistory 保留 system 并截断尾部", () => {
  const messages = [
    { role: "system", content: "sys" },
    ...Array.from({ length: 6 }, (_, index) => ({ role: "user", content: String(index) }))
  ]
  const clipped = clipHistory(messages, 3)
  assert.equal(clipped[0]?.role, "system")
  assert.equal(clipped.length, 3)
  assert.equal(clipped.at(-1)?.content, "5")
})

test("pruneModelMessages 去掉空消息", () => {
  const pruned = pruneModelMessages([
    { role: "user", content: "hi" },
    { role: "assistant", content: "" }
  ])
  assert.equal(pruned.length, 1)
  assert.equal(pruned[0]?.role, "user")
})

test("长会话 clipHistory 不超过上限且保留 system", () => {
  const messages = [
    { role: "system", content: "sys" },
    ...Array.from({ length: 500 }, (_, index) => ({ role: "user", content: String(index) }))
  ]
  const clipped = clipHistory(messages, 40)
  assert.equal(clipped[0]?.role, "system")
  assert.equal(clipped.length, 40)
  assert.equal(clipped.at(-1)?.content, "499")
})
