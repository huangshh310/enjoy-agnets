import assert from "node:assert/strict"
import { test } from "node:test"
import { flattenMessageKeys } from "./lookup.ts"
import { resolveLocale } from "./locale.ts"
import { en } from "./catalogs/en/index.ts"
import { zh } from "./catalogs/zh/index.ts"

test("explicit zh and en win over navigator", () => {
  assert.equal(resolveLocale("zh", "en-US"), "zh")
  assert.equal(resolveLocale("en", "zh-CN"), "en")
})

test("auto follows navigator, unknown falls back to zh", () => {
  assert.equal(resolveLocale("auto", "zh-CN"), "zh")
  assert.equal(resolveLocale("auto", "en-GB"), "en")
  assert.equal(resolveLocale("auto", "ja-JP"), "zh")
  assert.equal(resolveLocale(undefined, "fr-FR"), "zh")
})

test("zh and en catalogs expose the same keys", () => {
  assert.deepEqual(flattenMessageKeys(zh).sort(), flattenMessageKeys(en).sort())
})
