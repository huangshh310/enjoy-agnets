import assert from "node:assert/strict"
import { test } from "node:test"
import {
  linkedAssetIdsFromParts,
  matchOrphanedAssets,
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

test("旧会话按导入时间窗把孤儿资产挂回对应用户轮", () => {
  const matched = matchOrphanedAssets(
    [
      { id: "msg_doc", createdAt: 1_788_194_072_921, hasFileParts: false },
      { id: "msg_img", createdAt: 1_788_194_421_288, hasFileParts: false }
    ],
    [
      { id: "ast_md", name: "user-guide.md", mediaType: "text/markdown", createdAt: 1_788_194_065_536 },
      { id: "ast_jpg", name: "bg.jpg", mediaType: "image/jpeg", createdAt: 1_788_194_414_805 }
    ],
    new Set()
  )
  assert.deepEqual(matched.get("msg_doc"), [
    { assetId: "ast_md", mediaType: "text/markdown", name: "user-guide.md" }
  ])
  assert.deepEqual(matched.get("msg_img"), [
    { assetId: "ast_jpg", mediaType: "image/jpeg", name: "bg.jpg" }
  ])
})

test("已有 file part 的轮次不回挂，已挂接资产不复用", () => {
  const matched = matchOrphanedAssets(
    [
      { id: "msg_old", createdAt: 100, hasFileParts: true },
      { id: "msg_new", createdAt: 200, hasFileParts: false }
    ],
    [
      { id: "ast_used", name: "a.png", mediaType: "image/png", createdAt: 50 },
      { id: "ast_free", name: "b.png", mediaType: "image/png", createdAt: 150 }
    ],
    new Set(["ast_used"])
  )
  assert.equal(matched.has("msg_old"), false)
  assert.deepEqual(matched.get("msg_new"), [
    { assetId: "ast_free", mediaType: "image/png", name: "b.png" }
  ])
})

test("超过回看窗口的旧导入不挂到本轮", () => {
  const matched = matchOrphanedAssets(
    [{ id: "msg_now", createdAt: 200_000, hasFileParts: false }],
    [
      { id: "ast_old", name: "image.png", mediaType: "image/png", createdAt: 10_000 },
      { id: "ast_new", name: "bg.jpg", mediaType: "image/jpeg", createdAt: 199_000 }
    ],
    new Set()
  )
  assert.deepEqual(matched.get("msg_now"), [
    { assetId: "ast_new", mediaType: "image/jpeg", name: "bg.jpg" }
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
