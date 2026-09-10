/**
 * 聊天引用 search 解析与命中匹配。
 */
import test from "node:test"
import assert from "node:assert/strict"
import type { KnowledgeHit } from "@enjoy-agents/ipc-contract"
import {
  citeSearchKey,
  knowledgeCiteQuery,
  knowledgeSearchFromSource,
  matchCitedHit,
  parseKnowledgeSearch
} from "./knowledge-route-search.ts"

function hit(partial: Partial<KnowledgeHit> & { chunkId: string; path: string }): KnowledgeHit {
  return {
    sourceId: "src",
    snippet: "hello world",
    score: 0.1,
    ...partial
  }
}

test("parseKnowledgeSearch 收字符串行号", () => {
  const parsed = parseKnowledgeSearch({
    path: "docs/a.md",
    q: "hello",
    snippet: "hello world",
    startLine: "12"
  })
  assert.equal(parsed.path, "docs/a.md")
  assert.equal(parsed.startLine, 12)
})

test("knowledgeCiteQuery 优先 snippet", () => {
  assert.equal(
    knowledgeCiteQuery({ path: "a.ts", q: "query", snippet: "const x = 1" }),
    "const x = 1"
  )
  assert.equal(knowledgeCiteQuery({ path: "src/foo.ts" }), "foo.ts")
})

test("citeSearchKey 空引用是空串", () => {
  assert.equal(citeSearchKey({}), "")
  assert.ok(citeSearchKey({ path: "a.md" }).length > 0)
})

test("matchCitedHit 先按 path+行号", () => {
  const hits = [
    hit({ chunkId: "1", path: "a.md", startLine: 3, snippet: "alpha" }),
    hit({ chunkId: "2", path: "a.md", startLine: 9, snippet: "beta" })
  ]
  const matched = matchCitedHit(hits, { path: "a.md", startLine: 9, snippet: "alpha" })
  assert.equal(matched?.chunkId, "2")
})

test("knowledgeSearchFromSource 截断 q", () => {
  const search = knowledgeSearchFromSource({
    path: "readme.md",
    snippet: "x".repeat(200),
    startLine: 4
  })
  assert.equal(search.path, "readme.md")
  assert.equal(search.q?.length, 160)
  assert.equal(search.startLine, 4)
})
