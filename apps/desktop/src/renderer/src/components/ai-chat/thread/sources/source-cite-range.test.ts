import assert from "node:assert/strict"
import { test } from "node:test"
import { citedLineRange, formatCitedLines, highlightLineBounds } from "./source-cite-range.ts"

test("单行 cite 只标 L1，不高亮后面空行", () => {
  assert.deepEqual(citedLineRange({ startLine: 1 }), { start: 1, end: 1 })
  assert.equal(formatCitedLines({ start: 1, end: 1 }), "L1")
  assert.deepEqual(citedLineRange({ startLine: 42 }), { start: 42, end: 42 })
  assert.equal(formatCitedLines({ start: 42, end: 42 }), "L42")
})

test("明确跨行才标 L1–N；snippet 本身不扩高亮", () => {
  assert.deepEqual(
    citedLineRange({ startLine: 1, snippet: "# e2e workspace\nhello knowledge" }),
    { start: 1, end: 1 }
  )
  assert.deepEqual(
    citedLineRange({ startLine: 2, endLine: 2, snippet: "hello knowledge" }),
    { start: 2, end: 2 }
  )
  assert.deepEqual(
    citedLineRange({ startLine: 1, endLine: 3, snippet: "a\nb\nc" }),
    { start: 1, end: 3 }
  )
  assert.equal(formatCitedLines({ start: 1, end: 3 }), "L1–3")
  assert.equal(formatCitedLines({ start: 2, end: 2 }), "L2")
})

test("命中行高亮只盖匹配行，文件尾空行不着", () => {
  const file = "# e2e workspace\nhello knowledge\n"
  assert.deepEqual(highlightLineBounds({ start: 2, end: 2 }, file), { start: 2, end: 2 })
  assert.deepEqual(highlightLineBounds({ start: 1, end: 3 }, file), { start: 1, end: 2 })
})
