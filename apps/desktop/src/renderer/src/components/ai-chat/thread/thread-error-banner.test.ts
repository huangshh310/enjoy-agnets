import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const src = readFileSync(new URL("./thread-error-banner.tsx", import.meta.url), "utf8")

test("通用错误标题是模型这次没回完，正文走人话，错误码只进开发者档", () => {
  assert.match(src, /chat\.errorTitle/)
  // leo #151：正文走 displayThreadErrorText（人话化 + 展示脱敏）。
  assert.match(src, /displayThreadErrorText/)
  assert.match(src, /chat\.errorGenericHint/)
  assert.match(src, /isDevCopyEnabled/)
  assert.doesNotMatch(src, /chat\.errorRetryHint/)
})
