import assert from "node:assert/strict"
import { test } from "node:test"
import { messageSnippet, previewItemsFromMessages, railItemSize } from "./thread-preview-rail-items.ts"

const labels = { user: "你", assistant: "助手", empty: "（无正文）" }

test("把用户/助手轮折成刻度条目", () => {
  const items = previewItemsFromMessages(
    [
      { id: "u1", role: "user", content: "生成一个落地页使用html" },
      { id: "a1", role: "assistant", content: "先看项目结构，再写 index.html。" }
    ],
    labels
  )
  assert.equal(items.length, 2)
  assert.equal(items[0]?.id, "u1")
  assert.equal(items[0]?.label, "你")
  assert.match(items[0]?.ariaLabel ?? "", /^你:/)
  assert.match(items[1]?.ariaLabel ?? "", /^助手:/)
})

test("空正文用占位，不抛", () => {
  const [item] = previewItemsFromMessages([{ id: "a", role: "assistant", content: "   " }], labels)
  assert.equal(item?.description, "（无正文）")
  assert.equal(item?.label, "助手")
})

test("snippet 压缩空白并截断", () => {
  assert.equal(messageSnippet("  hello   world  "), "hello world")
  assert.equal(messageSnippet("x".repeat(80)).endsWith("…"), true)
})

test("消息多时刻度变密", () => {
  assert.equal(railItemSize(4), 22)
  assert.equal(railItemSize(12), 18)
  assert.equal(railItemSize(24), 14)
})
