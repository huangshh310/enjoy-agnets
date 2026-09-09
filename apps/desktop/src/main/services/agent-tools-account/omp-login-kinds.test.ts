/**
 * OMP 供应商登录形态：oauth / device / api_key / local。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { loginKindFor } from "./omp-login-kinds.ts"

test("官方可登录供应商按形态分流", () => {
  assert.equal(loginKindFor("github-copilot"), "device")
  assert.equal(loginKindFor("openai-codex-device"), "device")
  assert.equal(loginKindFor("google-antigravity"), "oauth")
  assert.equal(loginKindFor("ollama"), "local")
  assert.equal(loginKindFor("fireworks"), "api_key")
  assert.equal(loginKindFor("exa"), "api_key")
})
