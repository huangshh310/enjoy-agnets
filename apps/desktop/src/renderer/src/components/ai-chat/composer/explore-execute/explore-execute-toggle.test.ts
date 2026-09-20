/**
 * C1：探索/执行分段全引擎常驻，不能拦截时只禁用探索。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { canHostInterceptExplore } from "@enjoy-agents/ipc-contract/runtime-capabilities"

const dir = dirname(fileURLToPath(import.meta.url))

test("C1 源码不再按 executionModes 整颗 return null", () => {
  const src = readFileSync(join(dir, "explore-execute-toggle.tsx"), "utf8")
  assert.match(src, /composer-surface-toggle/)
  assert.match(src, /canHostInterceptExplore/)
  assert.match(src, /surfaceExploreDisabled/)
  assert.equal(src.includes("composerChromeFor"), false)
  assert.equal(src.includes("return null"), false)
})

test("HMAC 引擎能拦截；未知 id 不能", () => {
  assert.equal(canHostInterceptExplore("cursor"), true)
  assert.equal(canHostInterceptExplore("claude"), true)
  assert.equal(canHostInterceptExplore("enjoy-local"), true)
  assert.equal(canHostInterceptExplore("not-a-tool"), false)
})
