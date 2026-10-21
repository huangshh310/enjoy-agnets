import assert from "node:assert/strict"
import { test } from "node:test"
import { ENDPOINT_HOST_MAX, endpointHostLabel, fillProviderFace, presetBrand, providerFace } from "./provider-face.ts"

test("主机名：去掉协议 / 端口 / 路径 / 查询 / 账号", () => {
  assert.equal(endpointHostLabel("https://api.example.com/v1"), "api.example.com")
  assert.equal(endpointHostLabel("http://localhost:11434/v1"), "localhost")
  assert.equal(endpointHostLabel("https://user:pw@gw.corp.example.com:8443/openai/v1?key=abc#x"), "gw.corp.example.com")
  assert.equal(endpointHostLabel("  HTTPS://API.Example.COM/  "), "api.example.com")
  assert.equal(endpointHostLabel("http://[::1]:8080/v1"), "::1")
})

test("主机名太长：截到 30 字（含「…」）", () => {
  const long = "a-very-long-subdomain-name-for-testing.models.example-company.com"
  const label = endpointHostLabel(`https://${long}/v1`)!
  assert.equal(ENDPOINT_HOST_MAX, 30)
  assert.equal(label.length, 30)
  assert.ok(label.endsWith("…"))
  assert.equal(label, `${long.slice(0, 29)}…`)
  assert.equal(endpointHostLabel("https://abcdefghij.example.com"), "abcdefghij.example.com", "不长不截")
})

test("解析不了 / 非 http(s) / 空 → undefined", () => {
  for (const bad of ["", "   ", undefined, null, "not a url", "api.example.com/v1", "ftp://files.example.com", "file:///etc/hosts", "javascript:alert(1)"]) {
    assert.equal(endpointHostLabel(bad as never), undefined, String(bad))
  }
})

test("品牌名只认已知预设；custom / 未知 / 缺省不回落预设 id", () => {
  assert.equal(presetBrand("openai"), "OpenAI")
  assert.equal(presetBrand("deepseek"), "DeepSeek")
  assert.equal(presetBrand("custom"), undefined)
  assert.equal(presetBrand("mystery-preset"), undefined)
  assert.equal(presetBrand(undefined), undefined)
})

test("回落链：品牌 → 主机名 → 通用", () => {
  assert.deepEqual(providerFace({ kind: "openai", baseURL: "https://proxy.example.com" }), { kind: "named", name: "OpenAI" })
  assert.deepEqual(providerFace({ kind: "custom", baseURL: "https://proxy.example.com/v1" }), { kind: "named", name: "proxy.example.com" })
  assert.deepEqual(providerFace({ kind: "custom", baseURL: "bad" }), { kind: "generic" })
  assert.deepEqual(providerFace(undefined), { kind: "generic" })
})

test("fillProviderFace：通用说法句首用 Start 版，句中用小写版；其它变量照填", () => {
  const cat: Record<string, string> = {
    "chat.credentialProviderGeneric": "the model service",
    "chat.credentialProviderGenericStart": "The model service",
    "chat.start": "{name} rejected this key.",
    "chat.mid": "Could not reach {name}.",
    "chat.queue": "{provider} is out of credit, so {n} queued messages are on hold."
  }
  const t = (key: string, vars?: Record<string, string | number>) =>
    cat[key]!.replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? `{${k}}`))
  assert.equal(fillProviderFace(t, "chat.start", { kind: "generic" }), "The model service rejected this key.")
  assert.equal(fillProviderFace(t, "chat.mid", { kind: "generic" }), "Could not reach the model service.")
  assert.equal(fillProviderFace(t, "chat.queue", { kind: "generic" }, { varName: "provider", vars: { n: 2 } }), "The model service is out of credit, so 2 queued messages are on hold.")
  assert.equal(fillProviderFace(t, "chat.start", { kind: "named", name: "api.example.com" }), "api.example.com rejected this key.", "主机名不改大小写")
})
