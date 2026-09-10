/**
 * 芯片查表：Grok 不得命中 Codex 词条。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { SOURCE_NAME_KEY, catalogChipIds, sourceChipStatusKey, sourceNameKey } from "./source-chip-copy.ts"

test("每个 catalog id 都有独立 name key", () => {
  assert.deepEqual(catalogChipIds().sort(), Object.keys(SOURCE_NAME_KEY).sort())
  assert.ok(catalogChipIds().includes("grok"))
  assert.ok(catalogChipIds().includes("codex"))
  assert.equal(catalogChipIds().length, 12)
})

test("Grok 不得命中 Codex 词条", () => {
  assert.equal(SOURCE_NAME_KEY.grok, "cliUsageSource.grok")
  assert.notEqual(SOURCE_NAME_KEY.grok, SOURCE_NAME_KEY.codex)
  assert.equal(sourceNameKey("grok"), "pages.observability.cliUsageSource.grok")
  assert.equal(sourceNameKey("grok").includes("Codex"), false)
  assert.equal(sourceNameKey("grok").includes("codex"), false)
})

test("scanned-empty 用 fileCount 分文案", () => {
  const base = {
    id: "claude" as const,
    status: "scanned-empty" as const,
    sessionCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    totalTokens: 0
  }
  assert.equal(
    sourceChipStatusKey({ ...base, fileCount: 0 }),
    "pages.observability.cliUsageChipEmptyDir"
  )
  assert.equal(
    sourceChipStatusKey({ ...base, fileCount: 2 }),
    "pages.observability.cliUsageChipNoFields"
  )
})
