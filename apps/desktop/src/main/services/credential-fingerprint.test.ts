import assert from "node:assert/strict"
import { test } from "node:test"
import {
  credentialFingerprint,
  credentialProbeNeeded,
  sameOriginUrl
} from "./credential-fingerprint.ts"

test("指纹是哈希，不含明文", () => {
  const fp = credentialFingerprint({
    apiKey: "sk-secret",
    baseURL: "https://api.openai.com/v1",
    modelsURL: "https://api.openai.com/v1/models"
  })
  assert.equal(fp.length, 64)
  assert.equal(fp.includes("sk-secret"), false)
  assert.notEqual(
    fp,
    credentialFingerprint({
      apiKey: "sk-other",
      baseURL: "https://api.openai.com/v1",
      modelsURL: "https://api.openai.com/v1/models"
    })
  )
})

test("改名不探；换密钥或端点才探", () => {
  const existing = {
    apiKey: "sk-a",
    baseURL: "https://api.openai.com/v1",
    modelsURL: "https://api.openai.com/v1/models"
  }
  assert.equal(credentialProbeNeeded(undefined, existing), true)
  assert.equal(credentialProbeNeeded(existing, { apiKey: "" }), false)
  assert.equal(credentialProbeNeeded(existing, { apiKey: "sk-b" }), true)
  assert.equal(
    credentialProbeNeeded(existing, { apiKey: "", baseURL: "https://example.com/v1" }),
    true
  )
})

test("modelsURL 与 baseURL 必须同站", () => {
  assert.equal(sameOriginUrl("https://api.openai.com/v1", "https://api.openai.com/v1/models"), true)
  assert.equal(sameOriginUrl("https://api.openai.com/v1", "https://evil.example/models"), false)
})
