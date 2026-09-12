import assert from "node:assert/strict"
import { test } from "node:test"
import { displayBaseName, isHttpSource, shortenSourcePath } from "./source-path.ts"

test("展示名取末段，缩短超过三级的路径", () => {
  assert.equal(displayBaseName("src/auth/login.ts"), "login.ts")
  assert.equal(shortenSourcePath("src/auth/login.ts"), "src/auth/login.ts")
  assert.equal(shortenSourcePath("/Users/me/proj/ai-chat/composer/composer-mode.ts"), "ai-chat/composer/composer-mode.ts")
})

test("http(s) 视为网页来源，本轮不做", () => {
  assert.equal(isHttpSource("https://example.com/a"), true)
  assert.equal(isHttpSource("http://localhost/x"), true)
  assert.equal(isHttpSource("src/auth/login.ts"), false)
})
