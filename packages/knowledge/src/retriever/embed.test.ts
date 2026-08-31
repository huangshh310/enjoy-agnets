import assert from "node:assert/strict"
import { test } from "node:test"
import { cosineSimilarity } from "./cosine.ts"
import { hashedEmbedding } from "./embed.ts"

test("相同文本向量一致", () => {
  assert.deepEqual(hashedEmbedding("tool approval"), hashedEmbedding("tool approval"))
})

test("相关文本比无关文本更近", () => {
  const query = hashedEmbedding("approval hmac")
  const near = cosineSimilarity(query, hashedEmbedding("tool approval hmac token"))
  const far = cosineSimilarity(query, hashedEmbedding("unrelated weather forecast"))
  assert.ok(near > far)
})
