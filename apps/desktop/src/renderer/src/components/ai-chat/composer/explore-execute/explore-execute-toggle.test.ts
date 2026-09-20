/**
 * C1：两钮都可点。C2：整组禁用 + 可见原因。禁止整颗 return null。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { canHostInterceptExplore } from "@enjoy-agents/ipc-contract/runtime-capabilities"

const dir = dirname(fileURLToPath(import.meta.url))

test("C1/C2 源码：常驻分段，C2 整组禁用，不按 executionModes 藏掉", () => {
  const src = readFileSync(join(dir, "explore-execute-toggle.tsx"), "utf8")
  assert.match(src, /composer-surface-toggle/)
  assert.match(src, /canHostInterceptExplore/)
  assert.match(src, /composer-surface-disabled-reason/)
  assert.match(src, /surfaceExploreDisabled/)
  assert.match(src, /disabled=\{locked\}/)
  assert.equal(src.includes("composerChromeFor"), false)
  assert.equal(src.includes("return null"), false)
  assert.equal(src.includes("disabled={!canIntercept}"), false)
})

test("HMAC 引擎能拦截；未知 id 不能", () => {
  assert.equal(canHostInterceptExplore("cursor"), true)
  assert.equal(canHostInterceptExplore("claude"), true)
  assert.equal(canHostInterceptExplore("enjoy-local"), true)
  assert.equal(canHostInterceptExplore("not-a-tool"), false)
})
