import assert from "node:assert/strict"
import { test } from "node:test"
import { queueComposerAsset, takeComposerAssets } from "./composer-assets.ts"

test("takeComposerAssets 取出后清空", () => {
  queueComposerAsset("ast_1")
  queueComposerAsset("ast_2")
  assert.deepEqual(takeComposerAssets(), ["ast_1", "ast_2"])
  assert.deepEqual(takeComposerAssets(), [])
})
