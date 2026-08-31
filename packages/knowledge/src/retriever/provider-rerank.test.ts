import assert from "node:assert/strict"
import { test } from "node:test"
import { fallbackLocalRerank, rerankWithProvider } from "./provider-rerank.ts"

test("无模型时 Provider rerank 返回 null", async () => {
  const ranked = await rerankWithProvider(undefined, "query", [{ snippet: "a", score: 1 }])
  assert.equal(ranked, null)
})

test("非法模型隔离失败，回落调用方本地融合", async () => {
  const ranked = await rerankWithProvider({}, "query", [{ snippet: "a", score: 1 }])
  assert.equal(ranked, null)
})

test("本地回落仍按融合分排序", () => {
  const ranked = fallbackLocalRerank("alpha", [
    { snippet: "zzz", score: 0.1, lexical: 0 },
    { snippet: "alpha beta", score: 0.2, lexical: 1 }
  ])
  assert.equal(ranked[0]?.snippet, "alpha beta")
})
