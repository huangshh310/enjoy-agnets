import assert from "node:assert/strict"
import { test } from "node:test"
import { cosineSimilarity, lexicalScore, rankByCosine } from "./cosine.ts"

test("相同向量相似度为 1", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1)
})

test("正交向量相似度为 0", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-9)
})

test("rankByCosine 按分数截断", () => {
  const ranked = rankByCosine(
    [1, 0],
    [
      { id: "a", vector: [1, 0] },
      { id: "b", vector: [0, 1] }
    ],
    1
  )
  assert.equal(ranked[0]?.id, "a")
})

test("500 条向量排序在 200ms 内且不丢序", () => {
  const query = [1, 0, 0, 0]
  const items = Array.from({ length: 500 }, (_, index) => ({
    id: String(index),
    vector: [index === 7 ? 1 : 0, 1, 0, 0]
  }))
  const started = Date.now()
  const ranked = rankByCosine(query, items, 10)
  const elapsed = Date.now() - started
  assert.equal(ranked[0]?.id, "7")
  assert.equal(ranked.length, 10)
  assert.ok(elapsed < 200, `rank took ${elapsed}ms`)
})

test("lexicalScore 匹配查询词", () => {
  assert.ok(lexicalScore("tool approval", "tool approval HMAC") > 0.5)
})
