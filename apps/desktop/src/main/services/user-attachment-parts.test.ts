import assert from "node:assert/strict"
import { test } from "node:test"
import {
  linkedAssetIdsFromParts,
  userTurnParts
} from "./user-attachment-parts.ts"

test("用户轮次 parts 必须带 file，刷新才能回放气泡", () => {
  const parts = userTurnParts("这是什么图片", [
    { assetId: "ast_jpg", mediaType: "image/jpeg", name: "bg.jpg" }
  ])
  assert.deepEqual(parts, [
    { type: "text", text: "这是什么图片" },
    { type: "file", assetId: "ast_jpg", mediaType: "image/jpeg", name: "bg.jpg" }
  ])
})

test("从 parts 抽出已挂接资产 id", () => {
  assert.deepEqual(
    linkedAssetIdsFromParts([
      { type: "text", text: "hi" },
      { type: "file", assetId: "ast_1", mediaType: "image/png", name: "a.png" }
    ]),
    ["ast_1"]
  )
})
