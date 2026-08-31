import assert from "node:assert/strict"
import { test } from "node:test"
import { chunkId, chunkText } from "./chunk.ts"

test("相同内容产生相同 chunk id", () => {
  const a = chunkText("a.ts", "one\ntwo\nthree", 2)
  const b = chunkText("a.ts", "one\ntwo\nthree", 2)
  assert.deepEqual(
    a.map((item) => item.id),
    b.map((item) => item.id)
  )
  assert.equal(a[0]?.startLine, 1)
})

test("8000 行分块在 400ms 内完成", () => {
  const content = Array.from({ length: 8000 }, (_, index) => `line ${index} token`).join("\n")
  const started = Date.now()
  const chunks = chunkText("big.ts", content, 40)
  const elapsed = Date.now() - started
  assert.ok(chunks.length >= 100)
  assert.ok(elapsed < 400, `chunk ${chunks.length} took ${elapsed}ms`)
})

test("chunkId 稳定", () => {
  assert.equal(chunkId("a.ts", 1, 2, "hi"), chunkId("a.ts", 1, 2, "hi"))
  assert.notEqual(chunkId("a.ts", 1, 2, "hi"), chunkId("a.ts", 1, 2, "ho"))
})
