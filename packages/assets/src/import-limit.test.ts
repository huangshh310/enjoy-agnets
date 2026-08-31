import assert from "node:assert/strict"
import { test } from "node:test"
import { assertAssetImportSize, MAX_ASSET_IMPORT_BYTES } from "./import-limit.ts"

test("8 MB 以内通过，超过即拒", () => {
  assert.doesNotThrow(() => assertAssetImportSize(MAX_ASSET_IMPORT_BYTES))
  assert.throws(() => assertAssetImportSize(MAX_ASSET_IMPORT_BYTES + 1), /8 MB/)
})
