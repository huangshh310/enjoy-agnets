import assert from "node:assert/strict"
import { test } from "node:test"
import { catalogFor, installKindFor, isAllowedDocsUrl, modelArgsFor } from "./catalogs.ts"

test("P0 CLI 有模型表和安装说明", () => {
  assert.equal(installKindFor("claude"), "npm")
  assert.equal(installKindFor("codex"), "npm")
  assert.equal(installKindFor("antigravity"), "brew")
  assert.equal(installKindFor("cursor"), "copy")
  assert.ok((catalogFor("claude")?.models.length ?? 0) >= 3)
  assert.ok((catalogFor("cursor")?.models.length ?? 0) >= 3)
})

test("模型参数只接受目录里的 id", () => {
  assert.deepEqual(modelArgsFor("claude", "claude-sonnet-4-6"), ["--model", "claude-sonnet-4-6"])
  assert.deepEqual(modelArgsFor("claude", "not-a-model"), [])
  assert.deepEqual(modelArgsFor("claude", undefined), [])
})

test("文档 URL 只允许 https 与目录 host", () => {
  assert.equal(isAllowedDocsUrl("https://docs.anthropic.com/en/docs/claude-code"), true)
  assert.equal(isAllowedDocsUrl("https://cursor.com/docs/cli/overview"), true)
  assert.equal(isAllowedDocsUrl("https://evil.example/docs"), false)
  assert.equal(isAllowedDocsUrl("http://cursor.com/docs"), false)
  assert.equal(isAllowedDocsUrl("not-a-url"), false)
})
