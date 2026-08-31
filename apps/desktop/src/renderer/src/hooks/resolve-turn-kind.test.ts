/**
 * 本轮 kind：优先 stamp，其次用资产推断。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveTurnKind } from "./resolve-turn-kind.ts"

test("stamp 优先于当前推断", () => {
  assert.equal(resolveTurnKind({ runKind: "image", content: "later text" }), "image")
})

test("历史生图无 stamp 时按图片资产推断", () => {
  assert.equal(
    resolveTurnKind({
      content: "",
      assets: [{ mediaType: "image/png" }]
    }),
    "image"
  )
  assert.equal(resolveTurnKind({ content: "ok", assets: [{ mediaType: "image/png" }] }), "agent")
})
