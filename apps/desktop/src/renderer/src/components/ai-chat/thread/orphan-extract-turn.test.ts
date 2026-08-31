/**
 * Extract 误开的空助手轮要从线程里藏掉。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { isOrphanExtractTurn, visibleThreadMessages } from "./orphan-extract-turn.ts"

test("藏掉 Extract 误开的第二轮空卡片", () => {
  const image = {
    role: "assistant",
    content: "",
    assets: [{ assetId: "a" }],
    structured: { title: "大熊的呢" },
    components: [{ componentId: "card" }, { componentId: "asset-preview" }]
  }
  const ghost = {
    role: "assistant",
    content: "",
    structured: { title: "大熊的呢" },
    components: [{ componentId: "card" }]
  }
  assert.equal(isOrphanExtractTurn(ghost, image), true)
  assert.equal(visibleThreadMessages([image, ghost]).length, 1)
})

test("有正文的助手轮不藏", () => {
  const first = { role: "assistant", content: "hello", structured: { title: "a" } }
  const second = { role: "assistant", content: "again", structured: { title: "b" } }
  assert.equal(isOrphanExtractTurn(second, first), false)
})
