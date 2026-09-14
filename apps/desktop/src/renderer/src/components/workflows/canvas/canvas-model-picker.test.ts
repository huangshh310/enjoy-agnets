import assert from "node:assert/strict"
import test from "node:test"
import { filterModelsForMode } from "../lib/filter-models-for-mode.ts"

function model(id: string, capabilities: string[]) {
  return { id, capabilities }
}

test("生图节点只列出 image 能力模型", () => {
  const models = [model("grok", ["text"]), model("imagine", ["image"]), model("kling", ["video"])]
  assert.deepEqual(
    filterModelsForMode(models, "image").map((item) => item.id),
    ["imagine"]
  )
})

test("没有匹配能力时回退全部模型", () => {
  const models = [model("a", ["text"])]
  assert.equal(filterModelsForMode(models, "video").length, 1)
})
