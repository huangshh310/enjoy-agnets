import assert from "node:assert/strict"
import { test } from "node:test"
import { embeddingsNeedRebuild } from "./stale.ts"

test("无向量时不重建", () => {
  assert.equal(embeddingsNeedRebuild([], "hashed"), false)
})

test("模型变更或 hashed 升级为 Provider 时重建", () => {
  assert.equal(embeddingsNeedRebuild(["hashed"], "text-embedding-3-small"), true)
  assert.equal(embeddingsNeedRebuild(["old-model"], "text-embedding-3-small"), true)
  assert.equal(embeddingsNeedRebuild(["text-embedding-3-small"], "text-embedding-3-small"), false)
})
