import assert from "node:assert/strict"
import { test } from "node:test"
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"
import { zhChat } from "../i18n/catalogs/zh/chat.ts"
import { enChat } from "../i18n/catalogs/en/chat.ts"
import { endpointHostLabel, fillProviderFace, presetBrand, providerFace } from "./provider-face.ts"
import { LOCAL_PRESET_KINDS, PROVIDER_OFFICIAL_DOMAINS, hostHasDomainSuffix, isOfficialDomain, isOfficialEndpointHost, normalizeHost } from "./provider-official-domains.ts"

const brand = (kind: string) => ({ kind: "named", name: presetBrand(kind)! })
const named = (name: string) => ({ kind: "named", name })

test("后缀匹配：只在标签边界上（luna #164 S5a 要求 1）", () => {
  assert.equal(hostHasDomainSuffix("openai.com", "openai.com"), true, "本身")
  assert.equal(hostHasDomainSuffix("api.openai.com", "openai.com"), true)
  assert.equal(hostHasDomainSuffix("foo.bar.openai.com", "openai.com"), true, "多级子域")
  assert.equal(hostHasDomainSuffix("API.OpenAI.COM.", "openai.com"), true, "大小写 / 末尾根点")
  assert.equal(hostHasDomainSuffix("evilopenai.com", "openai.com"), false, "不在点上")
  assert.equal(hostHasDomainSuffix("openai.com.evil.com", "openai.com"), false, "后缀不在末尾")
  assert.equal(hostHasDomainSuffix("api.openai.com.evil.com", "openai.com"), false)
  assert.equal(hostHasDomainSuffix("openai.co", "openai.com"), false)
  assert.equal(hostHasDomainSuffix("penai.com", "openai.com"), false)
  assert.equal(hostHasDomainSuffix("", "openai.com"), false)
  assert.equal(hostHasDomainSuffix("openai.com", ""), false, "空后缀不能认一切")
  assert.equal(hostHasDomainSuffix(".openai.com", "openai.com"), true)
  assert.equal(normalizeHost(" [::1] "), "::1")
  assert.equal(normalizeHost("api.openai.com.."), "api.openai.com")
  assert.equal(isOfficialDomain("constructor", "api.openai.com"), false, "原型上的键不是预设")
  assert.equal(isOfficialDomain("custom", "api.openai.com"), false)
})

test("官方子域 → 品牌：OpenAI / Anthropic / DeepSeek（国内外同一域名）", () => {
  for (const host of ["openai.com", "api.openai.com", "foo.openai.com", "eu.api.openai.com"]) {
    assert.deepEqual(providerFace({ kind: "openai", baseURL: `https://${host}/v1` }), brand("openai"), host)
  }
  for (const host of ["api.anthropic.com", "foo.anthropic.com", "anthropic.com"]) {
    assert.deepEqual(providerFace({ kind: "anthropic", baseURL: `https://${host}` }), brand("anthropic"), host)
  }
  for (const host of ["api.deepseek.com", "foo.deepseek.com", "deepseek.com"]) {
    assert.deepEqual(providerFace({ kind: "deepseek", baseURL: `https://${host}/anthropic` }), brand("deepseek"), host)
  }
})

test("官方子域 → 品牌：通义 / DashScope 国内站、国际站、美国、香港、业务空间、Token Plan", () => {
  for (const host of [
    "dashscope.aliyuncs.com",
    "dashscope-intl.aliyuncs.com",
    "dashscope-us.aliyuncs.com",
    "cn-hongkong.dashscope.aliyuncs.com",
    "ws-123abc.cn-beijing.maas.aliyuncs.com",
    "ws-123abc.ap-southeast-1.maas.aliyuncs.com",
    "trial.cn-beijing.maas.aliyuncs.com",
    "token-plan.maas.qianwenaiapi.com"
  ]) {
    assert.deepEqual(providerFace({ kind: "qwen", baseURL: `https://${host}/compatible-mode/v1` }), brand("qwen"), host)
  }
})

test("官方子域 → 品牌：豆包 / 火山方舟各区域，BytePlus 方舟国际版", () => {
  for (const host of ["ark.cn-beijing.volces.com", "ark.cn-shanghai.volces.com", "ark.cn-guangzhou.volces.com", "ark.ap-southeast.bytepluses.com", "ark.eu-west.bytepluses.com"]) {
    assert.deepEqual(providerFace({ kind: "doubao", baseURL: `https://${host}/api/v3` }), brand("doubao"), host)
  }
})

test("官方子域 → 品牌：Kimi / Moonshot 国内站、国际站、Kimi Code 套餐", () => {
  for (const host of ["api.moonshot.cn", "api.moonshot.ai", "api.kimi.com", "api.kimi.ai", "foo.moonshot.cn", "moonshot.ai"]) {
    assert.deepEqual(providerFace({ kind: "kimi", baseURL: `https://${host}/coding/v1` }), brand("kimi"), host)
  }
})

test("预设列表里每一家、每个默认端点（含各区域 / 套餐）都落在自家白名单里，不会掉到主机名", () => {
  const local = new Set(["ollama", "lmstudio"])
  for (const preset of PROVIDER_PRESETS) {
    if (preset.kind === "custom") continue
    if (!local.has(preset.kind)) assert.ok(PROVIDER_OFFICIAL_DOMAINS[preset.kind]?.length, `${preset.kind} 没登记官方域名`)
    const urls = [
      ...Object.values(preset.endpoints ?? {}),
      ...(preset.regions ?? []).flatMap((region) => Object.values(region.endpoints ?? {}))
    ].filter((url): url is string => typeof url === "string" && url.length > 0)
    assert.ok(urls.length > 0, preset.kind)
    for (const url of urls) {
      if (!local.has(preset.kind)) assert.ok(isOfficialDomain(preset.kind, new URL(url).hostname), `${preset.kind}: ${url}`)
      assert.deepEqual(providerFace({ kind: preset.kind, baseURL: url }), brand(preset.kind), `${preset.kind}: ${url}`)
    }
  }
  const kinds = new Set(PROVIDER_PRESETS.map((preset) => preset.kind as string))
  for (const kind of Object.keys(PROVIDER_OFFICIAL_DOMAINS)) assert.ok(kinds.has(kind), `白名单里的 ${kind} 不是预设`)
})

test("后缀边界反例：仿冒 / 拼接 / 别家域名 → 主机名，不说品牌", () => {
  const cases: Array<[string, string]> = [
    ["openai", "evilopenai.com"],
    ["openai", "openai.com.evil.com"],
    ["openai", "api.openai.com.proxy.net"],
    ["openai", "my-openai.com"],
    ["anthropic", "anthropic.com.cn"],
    ["deepseek", "notdeepseek.com"],
    ["deepseek", "deepseek.com.relay.io"],
    ["kimi", "xmoonshot.cn"],
    ["kimi", "moonshot.cn.proxy.io"],
    ["kimi", "kimi.com-proxy.net"],
    ["qwen", "fakedashscope.aliyuncs.com"],
    ["qwen", "my-func.cn-hangzhou.fc.aliyuncs.com"],
    ["qwen", "dashscope.aliyuncs.com.evil.com"],
    ["doubao", "evilvolces.com"],
    ["doubao", "ark.cn-beijing.volces.com.evil.com"],
    // 预设 A 指到 B 家官方：连的不是 A，说主机名
    ["openai", "api.deepseek.com"]
  ]
  for (const [kind, host] of cases) {
    const face = providerFace({ kind, baseURL: `https://${host}/v1` })
    assert.deepEqual(face, named(endpointHostLabel(`https://${host}/v1`)!), `${kind} @ ${host}`)
    assert.ok((face as { name: string }).name.startsWith(host.slice(0, 29)), `${kind} @ ${host}`)
  }
})

test("代理 → 主机名：去掉协议 / 端口 / 路径 / 查询 / 账号 / 末尾根点", () => {
  assert.deepEqual(providerFace({ kind: "openai", baseURL: "https://proxy.example.com:8443/openai/v1?key=sk-x#frag" }), named("proxy.example.com"))
  assert.deepEqual(providerFace({ kind: "anthropic", baseURL: "http://user:pw@relay.example.cn:3000/anthropic" }), named("relay.example.cn"))
  assert.deepEqual(providerFace({ kind: "kimi", baseURL: "HTTPS://Gateway.Example.ORG./v1" }), named("gateway.example.org"))
  assert.deepEqual(providerFace({ kind: "qwen", baseURL: "http://10.0.0.8:8080/compatible-mode/v1" }), named("10.0.0.8"))
  // 官方主机带端口 / 末尾根点仍是这家
  assert.deepEqual(providerFace({ kind: "openai", baseURL: "https://api.openai.com.:443/v1" }), brand("openai"))
})

test("代理长主机名：截到 30 字（含「…」），不带协议 / 端口 / 路径", () => {
  const host = "a-very-long-subdomain.internal-gateway.example.com"
  const face = providerFace({ kind: "doubao", baseURL: `https://${host}:9443/api/v3` }) as { kind: string; name: string }
  assert.equal(face.kind, "named")
  assert.equal(face.name, `${host.slice(0, 29)}…`)
  assert.equal([...face.name].length, 30)
  assert.ok(!/https?:|:9443|\/api/.test(face.name), face.name)
})

test("代理主机名填进中文 / 英文文案：中文和拉丁之间留空格，挨中文标点不留，英文原样", () => {
  const t = (cat: Record<string, string>) => (path: string, vars?: Record<string, string | number>) =>
    String(cat[path.replace(/^chat\./, "")] ?? path).replace(/\{(\w+)\}/g, (_m, k) => String(vars?.[k] ?? ""))
  const zh = t(zhChat as never)
  const en = t(enChat as never)
  const proxy = providerFace({ kind: "openai", baseURL: "https://proxy.example.com:8443/v1" })
  assert.equal(fillProviderFace(zh, "chat.credentialNetworkNotice", proxy), "连不上 proxy.example.com，消息没发出去。检查网络后再试。")
  assert.equal(fillProviderFace(zh, "chat.queuePausedQuota", proxy, { varName: "provider", vars: { n: 2 } }), "proxy.example.com 额度用完了，排队的 2 条先不发。充值后点继续。")
  const long = providerFace({ kind: "openai", baseURL: "https://a-very-long-subdomain.internal-gateway.example.com/v1" }) as { kind: "named"; name: string }
  assert.equal(fillProviderFace(zh, "chat.credentialNetworkNotice", long), `连不上 ${long.name}，消息没发出去。检查网络后再试。`)
  assert.equal(fillProviderFace(zh, "chat.queuePausedQuota", long, { varName: "provider", vars: { n: 2 } }), `${long.name} 额度用完了，排队的 2 条先不发。充值后点继续。`, "「…」算西文，后面留空格")
  // 官方地址仍说品牌（中文品牌两边按中文判断）
  const qwen = providerFace({ kind: "qwen", baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" })
  assert.equal(fillProviderFace(zh, "chat.credentialNetworkNotice", qwen), "连不上通义千问 (Qwen / DashScope)，消息没发出去。检查网络后再试。")
  assert.equal(fillProviderFace(en, "chat.credentialNetworkNotice", proxy), "Could not reach proxy.example.com. The message was not sent. Check the network and try again.")
})

test("luna #164 ①：端点填了但没协议 / 解析不了 / 不是 http(s) →「模型服务」；空端点仍说品牌", () => {
  for (const bad of ["api.openai.com/v1", "proxy.example.com/v1", "not a url", "localhost:11434", "ftp://proxy.example.com", "https://", "http://exa mple.com"]) {
    assert.deepEqual(providerFace({ kind: "openai", baseURL: bad }), { kind: "generic" }, bad)
    assert.deepEqual(providerFace({ kind: "custom", baseURL: bad }), { kind: "generic" }, `custom ${bad}`)
  }
  for (const empty of [undefined, "", "   "]) {
    assert.deepEqual(providerFace({ kind: "openai", baseURL: empty }), brand("openai"), String(empty))
    assert.deepEqual(providerFace({ kind: "ollama", baseURL: empty }), brand("ollama"), `ollama ${String(empty)}`)
  }
  assert.deepEqual(providerFace({ kind: "custom", baseURL: "" }), { kind: "generic" })
  const t = (cat: Record<string, string>) => (path: string, vars?: Record<string, string | number>) =>
    String(cat[path.replace(/^chat\./, "")] ?? path).replace(/\{(\w+)\}/g, (_m, k) => String(vars?.[k] ?? ""))
  const face = providerFace({ kind: "openai", baseURL: "api.openai.com/v1" })
  assert.equal(fillProviderFace(t(zhChat as never), "chat.credentialNetworkNotice", face), "连不上模型服务，消息没发出去。检查网络后再试。")
  assert.equal(fillProviderFace(t(enChat as never), "chat.credentialNetworkNotice", face), "Could not reach the model service. The message was not sent. Check the network and try again.")
  assert.equal(
    fillProviderFace(t(enChat as never), "chat.credentialForbiddenNotice", face).startsWith("The model service "),
    true,
    "句首大写"
  )
})

test("luna #164 ②：本地预设认 localhost / 127.0.0.1 / ::1 任意端口；局域网机器说主机名；云端预设不认回环", () => {
  assert.deepEqual([...LOCAL_PRESET_KINDS].sort(), ["lmstudio", "ollama"], "本地预设 = 预设列表里 group local 的（custom 除外）")
  for (const kind of LOCAL_PRESET_KINDS) {
    for (const url of ["http://localhost:11434/v1", "http://LOCALHOST:1234/v1", "http://127.0.0.1:9999/v1", "http://127.0.0.1/v1", "http://[::1]:11434/v1", "https://localhost./v1"]) {
      assert.deepEqual(providerFace({ kind, baseURL: url }), brand(kind), `${kind} ${url}`)
    }
    assert.deepEqual(providerFace({ kind, baseURL: "http://192.168.1.5:11434/v1" }), named("192.168.1.5"), kind)
    assert.deepEqual(providerFace({ kind, baseURL: "http://gpu-box.lan:11434/v1" }), named("gpu-box.lan"), kind)
    assert.deepEqual(providerFace({ kind, baseURL: "http://localhost.evil.com:11434/v1" }), named("localhost.evil.com"), kind)
    assert.equal(isOfficialEndpointHost(kind, "[::1]"), true)
  }
  for (const kind of ["openai", "anthropic", "deepseek", "qwen", "doubao", "kimi"]) {
    for (const [url, host] of [["http://localhost:8080/v1", "localhost"], ["http://127.0.0.1:8080/v1", "127.0.0.1"], ["http://[::1]:8080/v1", "::1"]]) {
      assert.deepEqual(providerFace({ kind, baseURL: url }), named(host!), `${kind} ${url}`)
    }
  }
  const t = (path: string, vars?: Record<string, string | number>) =>
    String((zhChat as any)[path.replace(/^chat\./, "")] ?? path).replace(/\{(\w+)\}/g, (_m, k) => String(vars?.[k] ?? ""))
  assert.equal(fillProviderFace(t, "chat.providerUnreachableNotice", providerFace({ kind: "ollama", baseURL: "http://localhost:11434/v1" })), "连不上 Ollama，检查网络后再试")
  assert.equal(fillProviderFace(t, "chat.providerUnreachableNotice", providerFace({ kind: "ollama", baseURL: "http://192.168.1.5:11434/v1" })), "连不上 192.168.1.5，检查网络后再试")
})

test("leo rv164c：仿冒子域 / 账号部分 @ 两个方向 / 反斜杠 / 编码点，按 WHATWG URL 的主机判断", () => {
  const face = (url: string) => providerFace({ kind: "openai", baseURL: url })
  assert.deepEqual(face("https://api.openai.com.evil.com/v1"), named("api.openai.com.evil.com"))
  assert.deepEqual(face("https://evilapi.com/v1"), named("evilapi.com"))
  assert.deepEqual(face("https://evilopenai.com/v1"), named("evilopenai.com"))
  // 账号部分不算主机：主机是 @ 后面那段
  assert.deepEqual(face("https://api.openai.com@evil.com/v1"), named("evil.com"))
  assert.deepEqual(face("https://api.openai.com:sk-x@evil.com/v1"), named("evil.com"))
  assert.deepEqual(face("https://evil.com@api.openai.com/v1"), brand("openai"), "主机真是 api.openai.com")
  // 路径 / 查询 / 片段里出现官方域名不算
  assert.deepEqual(face("https://evil.com/api.openai.com"), named("evil.com"))
  assert.deepEqual(face("https://evil.com/?h=api.openai.com"), named("evil.com"))
  assert.deepEqual(face("https://evil.com#api.openai.com"), named("evil.com"))
  // WHATWG：特殊协议里「\\」等于「/」，主机是 api.openai.com；%2e 解码成点 → api.openai.com.evil.com
  assert.equal(new URL("https://api.openai.com\\@evil.com").hostname, "api.openai.com")
  assert.deepEqual(face("https://api.openai.com\\@evil.com"), brand("openai"))
  assert.deepEqual(face("https://api.openai.com%2eevil.com"), named("api.openai.com.evil.com"))
  // openai.com 的子域都归 OpenAI 管（luna 要求 1：foo.openai.com 认 openai.com），所以 evilapi.openai.com 也说品牌
  assert.deepEqual(face("https://evilapi.openai.com/v1"), brand("openai"))
  assert.deepEqual(face("https://my-resource.openai.azure.com/openai"), named("my-resource.openai.azure.com"), "Azure OpenAI 不是 openai.com")
})
