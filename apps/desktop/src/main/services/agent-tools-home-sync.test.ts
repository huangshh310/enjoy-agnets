/**
 * 同步芯片只覆盖可写家目录的 CLI，禁止给 Cursor / Grok 造假。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { homeConfigPathFor, homeSyncedFor } from "./agent-tools-home-sync.ts"

test("只有 Claude / Codex / OpenCode / Gemini 有家目录配置", () => {
  assert.ok(homeConfigPathFor("claude")?.endsWith("settings.json"))
  assert.ok(homeConfigPathFor("codex")?.endsWith("config.toml"))
  assert.ok(homeConfigPathFor("opencode")?.endsWith("opencode.json"))
  assert.ok(homeConfigPathFor("gemini")?.endsWith(".env"))
  assert.equal(homeConfigPathFor("cursor"), null)
  assert.equal(homeConfigPathFor("grok"), null)
  assert.equal(homeConfigPathFor("omp"), null)
})

test("不可同步的助手 homeSynced 恒为假", () => {
  assert.equal(homeSyncedFor("cursor"), false)
  assert.equal(homeSyncedFor("enjoy-local"), false)
})
