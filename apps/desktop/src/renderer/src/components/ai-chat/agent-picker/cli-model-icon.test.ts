/**
 * 右栏图标：有族名才走模型族；无族名回落引擎标，不要插头。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  cliModelEngineFallback,
  cliModelFamilyKey,
  cliModelIconMode,
  cliModelIconQuery
} from "./cli-model-icon.ts"

test("OMP 右栏必须按模型族出标，不能用引擎 omp 灰圆", () => {
  assert.equal(cliModelIconMode("omp", "google-antigravity/claude-opus-4-5"), "family")
  assert.equal(cliModelFamilyKey("google-antigravity/claude-opus-4-5", "Claude Opus 4.5"), "claude")
  assert.equal(cliModelFamilyKey("google-antigravity/gemini-3-flash", "Gemini 3 Flash"), "gemini")
  assert.equal(
    cliModelIconQuery({ id: "google-antigravity/claude-opus-4-5", label: "Claude Opus 4.5" }).modelId.includes(
      "claude"
    ),
    true
  )
})

test("Cursor 等无斜杠模型表仍画引擎标，避免退回插头", () => {
  assert.equal(cliModelIconMode("cursor", "auto"), "engine")
  assert.equal(cliModelFamilyKey("auto", "Auto (default)"), null)
})

test("Claude 绑了中转：deepseek-flash 画 DeepSeek 族标，不要 Claude 引擎标", () => {
  assert.equal(cliModelFamilyKey("deepseek-flash"), "deepseek")
  assert.equal(cliModelIconMode("claude", "deepseek-flash"), "family")
})

test("openai/gpt-5.4 这类 selector 认 OpenAI，不看供应商前缀 google", () => {
  assert.equal(cliModelIconMode("omp", "openai/gpt-5.4"), "family")
  assert.equal(cliModelFamilyKey("openai/gpt-5.4", "GPT-5.4"), "openai")
})

test("无族名回落引擎标，不要插头", () => {
  assert.equal(cliModelFamilyKey("google-antigravity/mystery-flash", "Mystery Flash"), null)
  assert.equal(cliModelEngineFallback("omp", "google-antigravity/mystery-flash"), "antigravity")
  assert.equal(cliModelEngineFallback("omp", "unknown-host/foo"), "omp")
})
