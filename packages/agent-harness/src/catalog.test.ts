import assert from "node:assert/strict"
import { test } from "node:test"
import {
  harnessAdapterForProvider,
  resolveHarnessAdapter
} from "./catalog.ts"

test("Anthropic 对上 Claude Code，且已可用", () => {
  const adapter = harnessAdapterForProvider("anthropic")
  assert.equal(adapter?.id, "claude-code")
  assert.equal(adapter?.available, true)
  assert.equal(adapter?.needsSandbox, true)
})

test("DeepSeek 有占位槽，但还不能开跑", () => {
  const adapter = harnessAdapterForProvider("deepseek")
  assert.equal(adapter?.id, "deepseek")
  assert.equal(adapter?.available, false)
  assert.equal(adapter?.comingSoon, true)
})

test("显式 harnessId 优先于当前 Provider", () => {
  const adapter = resolveHarnessAdapter("deepseek", "anthropic")
  assert.equal(adapter?.id, "deepseek")
})

test("未知供应商没有 Harness", () => {
  assert.equal(harnessAdapterForProvider("ollama"), undefined)
  assert.equal(resolveHarnessAdapter(undefined, "openai"), undefined)
})
