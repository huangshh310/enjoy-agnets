import assert from "node:assert/strict"
import { test } from "node:test"
import { blendRerankScore, rerankHits } from "./rerank.ts"

test("融合分偏向量但仍保留词袋", () => {
  assert.ok(blendRerankScore(1, 0) < blendRerankScore(0, 1))
})

test("rerankHits 按融合分重排", () => {
  const ranked = rerankHits([
    { id: "a", score: 0.2, lexical: 1 },
    { id: "b", score: 0.9, lexical: 0.1 }
  ])
  assert.equal(ranked[0]?.id, "b")
})
