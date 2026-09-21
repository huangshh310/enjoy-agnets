import assert from "node:assert/strict"
import { test } from "node:test"
import { quoteTextSelection } from "./quote-text-selection.ts"

test("空选区不引用", () => {
  assert.equal(quoteTextSelection({ text: "   " }), null)
})

test("划词走 text_selection，截断标题", () => {
  const quote = quoteTextSelection({ text: "  hello world  ", messageId: "m1" })
  assert.equal(quote?.type, "text_selection")
  assert.equal(quote?.content, "hello world")
  assert.equal(quote?.sourceId, "m1")
  assert.equal(quote?.title, "hello world")
})

test("划词保留换行", () => {
  const quote = quoteTextSelection({ text: "line one\nline two" })
  assert.equal(quote?.content, "line one\nline two")
  assert.equal(quote?.title, "line one")
})
