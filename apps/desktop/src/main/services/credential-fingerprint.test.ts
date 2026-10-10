import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { test } from "node:test"
import {
  credentialFingerprint,
  credentialFingerprintMaterial,
  credentialProbeNeeded,
  sameOriginUrl
} from "./credential-fingerprint.ts"

const source = {
  apiKey: "sk-secret",
  baseURL: "https://api.openai.com/v1",
  modelsURL: "https://api.openai.com/v1/models",
  apiStyle: "openai" as const,
  endpoints: { openai: "https://api.openai.com/v1" }
}

test("指纹是 HMAC，不含明文；本地重算无盐 sha256 对不上", () => {
  const secret = "unit-test-hmac"
  const fp = credentialFingerprint(source, secret)
  assert.equal(fp.length, 64)
  assert.equal(fp.includes("sk-secret"), false)
  const plain = createHash("sha256")
    .update(`${source.apiKey}\n${source.baseURL}\n${source.modelsURL}`)
    .digest("hex")
  assert.notEqual(fp, plain)
  const plainFull = createHash("sha256").update(credentialFingerprintMaterial(source)).digest("hex")
  assert.notEqual(fp, plainFull)
  assert.notEqual(
    fp,
    credentialFingerprint({ ...source, apiKey: "sk-other" }, secret)
  )
})

test("端点或 apiStyle 变了指纹就变", () => {
  const secret = "unit-test-hmac"
  const base = credentialFingerprint(source, secret)
  assert.notEqual(
    base,
    credentialFingerprint({ ...source, apiStyle: "anthropic" }, secret)
  )
  assert.notEqual(
    base,
    credentialFingerprint(
      { ...source, endpoints: { openai: "https://api.openai.com/v1", anthropic: "https://api.anthropic.com" } },
      secret
    )
  )
})

test("改名不探；换密钥、端点或协议才探", () => {
  const existing = {
    apiKey: "sk-a",
    baseURL: "https://api.openai.com/v1",
    modelsURL: "https://api.openai.com/v1/models",
    apiStyle: "openai" as const,
    endpoints: { openai: "https://api.openai.com/v1" }
  }
  assert.equal(credentialProbeNeeded(undefined, existing), true)
  assert.equal(credentialProbeNeeded(existing, { apiKey: "" }), false)
  assert.equal(credentialProbeNeeded(existing, { apiKey: "sk-b" }), true)
  assert.equal(
    credentialProbeNeeded(existing, { apiKey: "", baseURL: "https://example.com/v1" }),
    true
  )
  assert.equal(credentialProbeNeeded(existing, { apiKey: "", apiStyle: "anthropic" }), true)
  assert.equal(
    credentialProbeNeeded(existing, {
      apiKey: "",
      endpoints: { openai: "https://relay.example/v1" }
    }),
    true
  )
})

test("modelsURL 与 baseURL 必须同站", () => {
  assert.equal(sameOriginUrl("https://api.openai.com/v1", "https://api.openai.com/v1/models"), true)
  assert.equal(sameOriginUrl("https://api.openai.com/v1", "https://evil.example/models"), false)
})
