import assert from "node:assert/strict"
import { test } from "node:test"
import { mapHitLineRange, pinHitToQuery } from "./hit-line-range.ts"

const README = "# e2e workspace\nhello knowledge\n"

test("readme 命中 hello knowledge 只映到 L2，不是块首 L1 也不是整段 1–3", () => {
  const range = mapHitLineRange({
    startLine: 1,
    snippet: README,
    query: "hello knowledge"
  })
  assert.deepEqual(range, { start: 2, end: 2 })

  const pinned = pinHitToQuery(
    { startLine: 1, endLine: 3, snippet: README, path: "readme.md" },
    "hello knowledge"
  )
  assert.equal(pinned.startLine, 2)
  assert.equal(pinned.endLine, 2)
  assert.equal(pinned.snippet, "hello knowledge")
  assert.deepEqual(
    mapHitLineRange({
      startLine: pinned.startLine,
      snippet: pinned.snippet,
      query: "hello knowledge"
    }),
    { start: 2, end: 2 }
  )
})

test("没有 query 或对不上时守块首单行，不把整段 snippet 当成高亮", () => {
  assert.deepEqual(mapHitLineRange({ startLine: 1, snippet: README }), { start: 1, end: 1 })
  assert.deepEqual(
    mapHitLineRange({ startLine: 1, snippet: README, query: "   " }),
    { start: 1, end: 1 }
  )
  assert.deepEqual(
    mapHitLineRange({ startLine: 8, snippet: "alpha\nbeta", query: "zzz" }),
    { start: 8, end: 8 }
  )
})

test("连续多行都是最佳命中则标范围", () => {
  assert.deepEqual(
    mapHitLineRange({
      startLine: 10,
      snippet: "keep\nfoo bar\nfoo baz\ntrail",
      query: "foo"
    }),
    { start: 11, end: 12 }
  )
})
