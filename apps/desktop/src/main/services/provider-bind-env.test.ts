import assert from "node:assert/strict"
import { test } from "node:test"
import {
  codexWireApiFor,
  openCodeNpmFor,
  providerEnvFor,
  requireBindProfile
} from "./provider-bind-env.ts"

test("缺 Key 拒绝绑定，不静默退回官方登录", () => {
  assert.throws(() => requireBindProfile(undefined), /Providers/)
  assert.throws(() => requireBindProfile({ apiKey: "  " }), /Providers/)
})

test("Claude / Codex / DeepSeek / Gemini env 键", () => {
  const claude = providerEnvFor("claude", { apiKey: "sk-ant", baseURL: "https://gw.example" }, "sonnet")
  assert.equal(claude.ANTHROPIC_AUTH_TOKEN, "sk-ant")
  assert.equal(claude.ANTHROPIC_BASE_URL, "https://gw.example")
  assert.equal(claude.ANTHROPIC_MODEL, "sonnet")

  const codex = providerEnvFor("codex", { apiKey: "sk-oai", baseURL: "https://api.openai.com/v1" })
  assert.equal(codex.OPENAI_API_KEY, "sk-oai")
  assert.equal(codex.OPENAI_BASE_URL, "https://api.openai.com/v1")

  const dsk = providerEnvFor("deepseek", { apiKey: "sk-ds", baseURL: "https://api.deepseek.com/v1" })
  assert.equal(dsk.DEEPSEEK_API_KEY, "sk-ds")
  assert.equal(dsk.DEEPSEEK_BASE_URL, "https://api.deepseek.com/v1")

  const gem = providerEnvFor("gemini", { apiKey: "gk", baseURL: "https://generativelanguage.googleapis.com" }, "gemini-2.5-pro")
  assert.equal(gem.GEMINI_API_KEY, "gk")
  assert.equal(gem.GEMINI_API_BASE_URL, "https://generativelanguage.googleapis.com")
  assert.equal(gem.GEMINI_MODEL, "gemini-2.5-pro")
})

test("OpenCode 带 ENJOY_OPENCODE_KEY，并按协议附带官方 env", () => {
  const oc = providerEnvFor(
    "opencode",
    { apiKey: "sk", baseURL: "https://api.anthropic.com", apiStyle: "anthropic", kind: "anthropic" },
    "opus"
  )
  assert.equal(oc.ENJOY_OPENCODE_KEY, "sk")
  assert.equal(oc.ANTHROPIC_MODEL, "opus")
  assert.equal(openCodeNpmFor({ apiKey: "x", apiStyle: "anthropic" }), "@ai-sdk/anthropic")
  assert.equal(codexWireApiFor({ apiKey: "x", apiStyle: "openai" }), "chat")
  assert.equal(codexWireApiFor({ apiKey: "x", apiStyle: "openai-responses" }), "responses")
})
