import assert from "node:assert/strict"
import { test } from "node:test"
import {
  listComposerAssets,
  queueComposerAsset,
  removeComposerAsset,
  takeComposerAssetDetails,
  takeComposerAssets
} from "./composer-assets.ts"

test("takeComposerAssets 取出后清空", () => {
  queueComposerAsset("ast_1")
  queueComposerAsset("ast_2")
  assert.deepEqual(takeComposerAssets(), ["ast_1", "ast_2"])
  assert.deepEqual(takeComposerAssets(), [])
})

test("queueComposerAsset 对象形式与 removeComposerAsset", () => {
  queueComposerAsset({
    id: "ast_img",
    name: "screenshot.png",
    mediaType: "image/png",
    size: 1024,
    url: "blob:mock"
  })
  queueComposerAsset({
    id: "ast_doc",
    name: "notes.txt",
    mediaType: "text/plain"
  })
  assert.equal(listComposerAssets().length, 2)
  removeComposerAsset("ast_img")
  const remaining = takeComposerAssetDetails()
  assert.equal(remaining.length, 1)
  assert.equal(remaining[0].id, "ast_doc")
  assert.equal(remaining[0].name, "notes.txt")
})

