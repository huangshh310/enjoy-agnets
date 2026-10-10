import assert from "node:assert/strict"
import { test } from "node:test"
import { presetFor } from "@enjoy-agents/providers/presets"
import { presetConsoleUrl } from "./preset-console-url.ts"

test("官网链接只认预设 keysURL，不猜、不用 docsURL", () => {
  const deepseek = presetFor("deepseek")
  assert.ok(deepseek.keysURL)
  assert.equal(presetConsoleUrl("deepseek"), new URL(deepseek.keysURL!).toString())
  assert.equal(presetConsoleUrl("custom"), undefined)
  assert.equal(presetConsoleUrl("not-a-real-kind"), undefined)
  assert.equal(presetConsoleUrl(""), undefined)
  assert.equal(presetConsoleUrl(undefined), undefined)
  const custom = presetFor("custom")
  assert.equal(custom.keysURL, undefined)
  assert.notEqual(presetConsoleUrl("deepseek"), custom.docsURL)
})
