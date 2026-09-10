import assert from "node:assert/strict"
import { test } from "node:test"
import {
  backupPathFor,
  escapeTomlString,
  mergeCodexToml,
  mergeGeminiEnv,
  mergeOpenCodeJson,
  sanitizeTomlComment,
  stripEnjoyTomlBlock
} from "./cli-config-format.ts"

test("TOML 字符串转义引号与换行", () => {
  assert.equal(escapeTomlString(`a"b\\c`), String.raw`a\"b\\c`)
  assert.equal(escapeTomlString("line\nnext"), String.raw`line\nnext`)
})

test("注释去掉换行，避免注入新键", () => {
  assert.equal(sanitizeTomlComment("ok\nmodel_provider = \"x\""), 'ok model_provider = "x"')
})

test("Codex merge 写官方 model_providers.enjoy，不写顶层 api_key", () => {
  const merged = mergeCodexToml("model = \"o3\"\n", {
    baseUrl: "https://example.com/v1",
    profileName: "Relay",
    model: "gpt-5.4",
    wireApi: "responses"
  })
  assert.match(merged, /model = "o3"/)
  assert.match(merged, /enjoy-agents:begin/)
  assert.match(merged, /model_provider = "enjoy"/)
  assert.match(merged, /\[model_providers\.enjoy\]/)
  assert.match(merged, /base_url = "https:\/\/example.com\/v1"/)
  assert.match(merged, /env_key = "OPENAI_API_KEY"/)
  assert.doesNotMatch(merged, /^\s*api_key\s*=/m)
  assert.match(merged, /wire_api = "responses"/)
})

test("Codex 纯 Chat Completions 写 wire_api=chat", () => {
  const merged = mergeCodexToml("", {
    baseUrl: "https://relay.example/v1",
    profileName: "Relay",
    wireApi: "chat"
  })
  assert.match(merged, /wire_api = "chat"/)
  assert.doesNotMatch(merged, /^\s*api_key\s*=/m)
})

test("再次 merge 只替换标记块，不叠两份", () => {
  const first = mergeCodexToml("keep = true\n", {
    baseUrl: "https://a.example/v1",
    profileName: "A"
  })
  const second = mergeCodexToml(first, {
    baseUrl: "https://b.example/v1",
    profileName: "B"
  })
  assert.equal(second.match(/enjoy-agents:begin/g)?.length, 1)
  assert.match(second, /keep = true/)
  assert.match(second, /base_url = "https:\/\/b.example\/v1"/)
  assert.doesNotMatch(second, /https:\/\/a.example/)
})

test("strip 掉损坏的半截标记块", () => {
  assert.equal(stripEnjoyTomlBlock("head\n# --- enjoy-agents:begin ---\norphan"), "head")
})

test("备份路径挂在原文件旁", () => {
  assert.equal(backupPathFor("/tmp/config.toml"), "/tmp/config.toml.enjoy.bak")
})

test("OpenCode merge 用 env 模板，不写明文 Key", () => {
  const merged = mergeOpenCodeJson("{}", {
    name: "Relay",
    baseUrl: "https://api.example/v1",
    model: "kimi-k3",
    npm: "@ai-sdk/openai-compatible"
  })
  assert.match(merged, /"enjoy"/)
  assert.match(merged, /ENJOY_OPENCODE_KEY/)
  assert.doesNotMatch(merged, /sk-/)
  assert.match(merged, /enjoy\/kimi-k3/)
})

test("Gemini .env 写标记段", () => {
  const merged = mergeGeminiEnv("FOO=1\n", { apiKey: "gk", baseUrl: "https://g.example", model: "gemini-2.5-pro" })
  assert.match(merged, /FOO=1/)
  assert.match(merged, /GEMINI_API_KEY=gk/)
  assert.match(merged, /GEMINI_MODEL=gemini-2.5-pro/)
})
