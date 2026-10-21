import assert from "node:assert/strict"
import { test } from "node:test"
import { sendFailureProviderName } from "./send-failure-provider-name.ts"
import { readFileSync } from "node:fs"

const tools = [
  { id: "amp", label: "Amp" },
  { id: "custom:fake-acp", label: "假本机助手" }
]
const named = (name: string) => ({ kind: "named" as const, name })
const DS = named("DeepSeek")

test("luna m136b-62：Amp 会话失败卡说 Amp，不说聊天密钥档案名（DeepSeek / E2E Stub Key）", () => {
  assert.deepEqual(sendFailureProviderName({ runtimeId: "amp", tools, displayNames: {}, provider: DS }), named("Amp"))
  assert.deepEqual(sendFailureProviderName({ runtimeId: "custom:fake-acp", tools, displayNames: {}, provider: DS }), named("假本机助手"))
})

test("引擎起了显示名就用显示名；空 / 「未命名」回退品牌名", () => {
  assert.deepEqual(sendFailureProviderName({ runtimeId: "amp", tools, displayNames: { amp: "小安" }, provider: DS }), named("小安"))
  assert.deepEqual(sendFailureProviderName({ runtimeId: "amp", tools, displayNames: { amp: "未命名" }, provider: DS }), named("Amp"))
})

test("引擎不在列表里：不拿密钥档案 / 供应商 / 原始 runtimeId 顶名，退到「模型服务」", () => {
  assert.deepEqual(sendFailureProviderName({ runtimeId: "codex", tools, displayNames: {}, provider: DS }), { kind: "generic" })
  assert.deepEqual(
    sendFailureProviderName({ runtimeId: "custom:acp_7f3a", tools, displayNames: {}, provider: DS }),
    { kind: "generic" }
  )
  // 用户给它起的名字仍然算
  assert.deepEqual(sendFailureProviderName({ runtimeId: "codex", tools, displayNames: { codex: "小码" }, provider: DS }), named("小码"))
})

test("Enjoy 本地 / 还没定引擎：说供应商（调用方传 defaultProviderFace 的结果）", () => {
  assert.deepEqual(sendFailureProviderName({ runtimeId: "enjoy-local", tools, displayNames: {}, provider: DS }), DS)
  assert.deepEqual(sendFailureProviderName({ runtimeId: null, tools, displayNames: {}, provider: DS }), DS)
})

// luna P2（定稿）：失败卡只说供应商 / 引擎名，密钥档案名（「Work key A」「E2E Stub Key」）哪儿都不出现，括号里也不要；
// 自定义端点只说主机名；都没有说「模型服务」/ "the model service"（句首大写）。预设 id、协议、路径、端口也不出现。
const CARD_KEYS = ["credentialNetworkNotice", "credentialInvalidNotice", "credentialForbiddenNotice", "credentialBillingNotice", "providerUnreachableNotice"]

async function cards() {
  const { defaultProviderFace } = await import("./default-provider-label.ts")
  const { fillProviderFace } = await import("./provider-face.ts")
  const { zhChat } = await import("../i18n/catalogs/zh/chat.ts")
  const { enChat } = await import("../i18n/catalogs/en/chat.ts")
  const { interpolate } = await import("../i18n/lookup.ts")
  const tOf = (cat: Record<string, string>) => (key: string, vars?: Record<string, string | number>) =>
    interpolate(cat[key.replace(/^chat\./, "")]!, vars)
  const readiness = { defaultRoute: { runtimeId: "enjoy-local", profileId: "prv_a" }, apiKeys: [] } as never
  const render = (row: Record<string, unknown>) => {
    const face = sendFailureProviderName({
      runtimeId: "enjoy-local",
      tools,
      displayNames: {},
      provider: defaultProviderFace(readiness, [{ id: "prv_a", active: true, hasKey: true, ...row }])
    })
    return [zhChat, enChat].flatMap((cat) =>
      CARD_KEYS.map((key) => ({ key, lang: cat === zhChat ? "zh" : "en", text: fillProviderFace(tOf(cat as never), `chat.${key}`, face) }))
    )
  }
  return { render }
}

test("luna P2：Enjoy 本地五种失败文案中英都说品牌名，不出现档案名 / 预设 id / 括号", async () => {
  const { render } = await cards()
  // 端点用各家官方地址（改到别的地址会说主机名，见 provider-face S5）
  const official = { openai: "https://api.openai.com/v1", deepseek: "https://api.deepseek.com/v1" } as const
  for (const [profile, kind, brand] of [["Work key A", "openai", "OpenAI"], ["E2E Stub Key", "openai", "OpenAI"], ["我的 DS 钥匙", "deepseek", "DeepSeek"]] as const) {
    for (const { key, text } of render({ name: profile, kind, baseURL: official[kind] })) {
      assert.ok(text.includes(brand), `${key}: ${text}`)
      assert.ok(!text.includes(profile), `${key} 出现了档案名：${text}`)
      assert.ok(!text.includes(kind === "openai" ? "openai" : kind), `${key} 出现了预设 id：${text}`)
      assert.ok(!/[（(]/.test(text), `${key} 带了括号补充：${text}`)
    }
  }
  const zh = render({ name: "E2E Stub Key", kind: "openai" })
  assert.equal(zh.find((c) => c.lang === "zh" && c.key === "credentialInvalidNotice")!.text, "密钥没通过：OpenAI 不认这把密钥，消息没发出去。")
  assert.equal(zh.find((c) => c.lang === "zh" && c.key === "credentialNetworkNotice")!.text, "连不上 OpenAI，消息没发出去。检查网络后再试。")
})

test("luna P2：自定义端点只说主机名——不带协议 / 端口 / 路径 / 查询 / 账号，不出现档案名", async () => {
  const { render } = await cards()
  const all = render({ name: "我的网关", kind: "custom", baseURL: "https://bob:s3cret@api.example.com:8443/v1/chat?team=x" })
  for (const { key, text } of all) {
    assert.ok(text.includes("api.example.com"), `${key}: ${text}`)
    for (const bad of ["我的网关", "custom", "https", "://", "8443", "/v1", "team=x", "bob", "s3cret"]) {
      assert.ok(!text.includes(bad), `${key} 露出了「${bad}」：${text}`)
    }
  }
  assert.equal(all.find((c) => c.lang === "zh" && c.key === "credentialNetworkNotice")!.text, "连不上 api.example.com，消息没发出去。检查网络后再试。")
  assert.equal(all.find((c) => c.lang === "en" && c.key === "credentialNetworkNotice")!.text, "Could not reach api.example.com. The message was not sent. Check the network and try again.")
})

test("luna P2：认不出也没地址 → 「模型服务」/ the model service；英文句首大写、句中小写", async () => {
  const { render } = await cards()
  const all = render({ name: "Work key A", kind: "mystery-preset", baseURL: "::not a url::" })
  const pick = (lang: string, key: string) => all.find((c) => c.lang === lang && c.key === key)!.text
  assert.equal(pick("zh", "credentialNetworkNotice"), "连不上模型服务，消息没发出去。检查网络后再试。")
  assert.equal(pick("zh", "credentialInvalidNotice"), "密钥没通过：模型服务不认这把密钥，消息没发出去。")
  assert.equal(pick("en", "credentialNetworkNotice"), "Could not reach the model service. The message was not sent. Check the network and try again.")
  assert.equal(pick("en", "providerUnreachableNotice"), "Can't reach the model service. Check the network and try again.")
  assert.equal(pick("en", "credentialInvalidNotice"), "The model service rejected this key, so the message was not sent.")
  assert.match(pick("en", "credentialForbiddenNotice"), /^The model service refused this request/)
  assert.match(pick("en", "credentialBillingNotice"), /^The model service reported a quota or billing issue/)
  for (const { key, text } of all) {
    assert.ok(!/Work key A|mystery-preset|not a url/.test(text), `${key}: ${text}`)
    assert.ok(!text.startsWith("the "), `${key} 句首没大写：${text}`)
  }
})

test("接线：失败卡的 hook 取 defaultProviderFace，不再用档案名（defaultProviderLabel 已删）", () => {
  const hook = readFileSync(new URL("../hooks/use-send-failure-provider-name.ts", import.meta.url), "utf8").replace(/\/\/.*$/gm, "")
  assert.match(hook, /provider: defaultProviderFace\(/)
  assert.ok(!/defaultProviderLabel|keyProfileName|credentialProviderFallback/.test(hook))
})

// 接线：三张失败卡都走 useSendFailureProviderName（node:test 渲染不了 .tsx，只能读源码）。
test("接线：连不上 / 密钥没通过 / 拒绝·额度 三张卡的 {name} 都跟前台引擎走", () => {
  for (const file of ["thread-credential-network-notice.tsx", "thread-credential-invalid-notice.tsx", "thread-credential-restricted-notice.tsx"]) {
    const src = readFileSync(new URL(`../components/ai-chat/thread/${file}`, import.meta.url), "utf8").replace(/\/\/.*$/gm, "")
    assert.match(src, /const face = useSendFailureProviderName\(\)/, file)
    assert.match(src, /fillProviderFace\(t, /, `${file} 没走 fillProviderFace（通用说法句首大写）`)
    assert.ok(!/name = defaultProviderLabel\(/.test(src), `${file} 又拿密钥档案名当 {name}`)
  }
  const hook = readFileSync(new URL("../hooks/use-send-failure-provider-name.ts", import.meta.url), "utf8")
  assert.match(hook, /runtimeId = useChatStore\(\(state\) => state\.runtimeId\)/)
  assert.match(hook, /sendFailureProviderName\(\{\s*runtimeId,/)
})
