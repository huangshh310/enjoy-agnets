import assert from "node:assert/strict"
import { test } from "node:test"
import { usesOfficialGoogle } from "./google.ts"

test("Google 默认与无 /openai 的 URL 走官方工厂", () => {
  assert.equal(usesOfficialGoogle({ provider: "google" }), true)
  assert.equal(usesOfficialGoogle({ provider: "google", baseURL: "https://generativelanguage.googleapis.com/v1beta" }), true)
})

test("带 /openai 的 Gemini 兼容端点不走官方工厂", () => {
  assert.equal(
    usesOfficialGoogle({
      provider: "google",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai"
    }),
    false
  )
  assert.equal(usesOfficialGoogle({ provider: "openai", baseURL: "https://api.openai.com/v1" }), false)
})
