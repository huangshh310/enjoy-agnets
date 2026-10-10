import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const src = readFileSync(new URL("./thread-error-banner.tsx", import.meta.url), "utf8")

test("存储失败只用一句人话，错误码只进开发者档", () => {
  assert.match(src, /chat\.errorRetryHint/)
  assert.match(src, /isDevCopyEnabled/)
  assert.doesNotMatch(src, /chat\.errorTitle/)
})
