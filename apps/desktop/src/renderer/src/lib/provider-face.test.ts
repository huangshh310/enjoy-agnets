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
  assert.deepEqual(providerFace({ kind: "openai", baseURL: "https://api.openai.com/v1" }), { kind: "named", name: "OpenAI" })
  assert.deepEqual(providerFace({ kind: "openai" }), { kind: "named", name: "OpenAI" })
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

test("预设品牌 + 改过的端点（代理 / 中转 / 自建）：说主机名，不说品牌（leo #164 S5）", () => {
  assert.deepEqual(providerFace({ kind: "openai", baseURL: "https://proxy.example.com/v1" }), { kind: "named", name: "proxy.example.com" })
  assert.deepEqual(providerFace({ kind: "deepseek", baseURL: "https://my-relay.cn:8443/v1?x=1" }), { kind: "named", name: "my-relay.cn" })
  // 官方地址换了协议路径 / 大小写 / 末尾斜杠，仍是这家
  assert.deepEqual(providerFace({ kind: "deepseek", baseURL: "https://API.deepseek.com/anthropic/" }), { kind: "named", name: "DeepSeek" })
  // 本地预设（Ollama）只改端口：主机还是官方的 127.0.0.1 → 仍说品牌
  const ollama = providerFace({ kind: "ollama", baseURL: "http://127.0.0.1:9999/v1" })
  assert.equal(ollama.kind, "named")
  assert.notEqual((ollama as { name: string }).name, "127.0.0.1")
  // 预设的其它区域 / 套餐官方地址（Kimi 国际站 api.moonshot.ai、编程套餐 api.kimi.com）也算这家
  assert.deepEqual(providerFace({ kind: "kimi", baseURL: "https://api.moonshot.ai/v1" }), { kind: "named", name: presetBrand("kimi")! })
  assert.deepEqual(providerFace({ kind: "kimi", baseURL: "https://api.kimi.com/coding/v1" }), { kind: "named", name: presetBrand("kimi")! })
  // 地址填了但解析不了：luna #164 ① 说「模型服务」，不回落品牌
  assert.deepEqual(providerFace({ kind: "openai", baseURL: "not a url" }), { kind: "generic" })
  // 长主机名照样截断；不出现协议、路径、预设 id
  const long = providerFace({ kind: "openai", baseURL: "https://a-very-long-subdomain.internal-gateway.example.com/v1" })
  assert.equal(long.kind, "named")
  const name = (long as { name: string }).name
  assert.ok(name.endsWith("…") && [...name].length <= 30, name)
  assert.ok(!/https?:|\/v1|openai/i.test(name), name)
})

test("luna #164 第 3 轮 2：自定义档案说档案名（去空白、按码点 ≤30 加「…」）；名字空 → 主机名 → 通用；预设不吃档案名", async () => {
  const { profileNameLabel, CUSTOM_PROFILE_KIND } = await import("./provider-face.ts")
  assert.equal(CUSTOM_PROFILE_KIND, "custom")
  assert.equal(profileNameLabel("  我的网关  "), "我的网关")
  assert.equal(profileNameLabel(""), undefined)
  assert.equal(profileNameLabel("   "), undefined)
  assert.equal(profileNameLabel(undefined), undefined)
  assert.equal(profileNameLabel("a".repeat(30)), "a".repeat(30))
  assert.equal(profileNameLabel("a".repeat(31)), `${"a".repeat(29)}…`)
  assert.equal(profileNameLabel("😀".repeat(31)), `${"😀".repeat(29)}…`, "按码点截，不切半个 emoji")
  assert.equal(profileNameLabel(` ${"b".repeat(30)} `), "b".repeat(30), "先去空白再数")
  const named = (name: string) => ({ kind: "named", name })
  assert.deepEqual(providerFace({ kind: "custom", name: " Team Relay ", baseURL: "https://proxy.example.com/v1" }), named("Team Relay"))
  assert.deepEqual(providerFace({ kind: "custom", name: "我的网关", baseURL: "bad" }), named("我的网关"))
  assert.deepEqual(providerFace({ kind: "custom", name: "我的网关" }), named("我的网关"))
  assert.deepEqual(providerFace({ kind: "custom", name: " ", baseURL: "https://proxy.example.com:8443/v1" }), named("proxy.example.com"))
  assert.deepEqual(providerFace({ kind: "custom", name: "", baseURL: "bad" }), { kind: "generic" })
  assert.deepEqual(providerFace({ kind: "custom", name: "" }), { kind: "generic" })
  // 预设（含本地预设）和未知 kind：档案名一律不出现
  assert.deepEqual(providerFace({ kind: "openai", name: "我的网关", baseURL: "https://proxy.example.com/v1" }), named("proxy.example.com"))
  assert.deepEqual(providerFace({ kind: "openai", name: "我的网关", baseURL: "bad" }), { kind: "generic" })
  assert.deepEqual(providerFace({ kind: "openai", name: "我的网关" }), named("OpenAI"))
  assert.deepEqual(providerFace({ kind: "ollama", name: "我的网关", baseURL: "http://192.168.1.5:11434/v1" }), named("192.168.1.5"))
  assert.deepEqual(providerFace({ kind: "mystery", name: "我的网关", baseURL: "https://proxy.example.com/v1" }), named("proxy.example.com"))
  assert.deepEqual(providerFace({ name: "我的网关" }), { kind: "generic" })
  assert.deepEqual(providerFace({ kind: "Custom", name: "我的网关" }), { kind: "generic" }, "kind 大小写不放宽")
})
