import assert from "node:assert/strict"
import { test } from "node:test"
import { sendFailureProviderName } from "./send-failure-provider-name.ts"
import { readFileSync } from "node:fs"

const tools = [
  { id: "amp", label: "Amp" },
  { id: "custom:fake-acp", label: "假本机助手" }
]

test("luna m136b-62：Amp 会话失败卡说 Amp，不说聊天密钥档案名（DeepSeek / E2E Stub Key）", () => {
  assert.equal(sendFailureProviderName({ runtimeId: "amp", tools, displayNames: {}, providerName: "DeepSeek" }), "Amp")
  assert.equal(sendFailureProviderName({ runtimeId: "custom:fake-acp", tools, displayNames: {}, providerName: "E2E Stub Key" }), "假本机助手")
})

test("引擎起了显示名就用显示名；空 / 「未命名」回退品牌名", () => {
  assert.equal(sendFailureProviderName({ runtimeId: "amp", tools, displayNames: { amp: "小安" }, providerName: "DeepSeek" }), "小安")
  assert.equal(sendFailureProviderName({ runtimeId: "amp", tools, displayNames: { amp: "未命名" }, providerName: "DeepSeek" }), "Amp")
})

test("引擎不在列表里也不拿密钥档案顶名，用 runtimeId", () => {
  assert.equal(sendFailureProviderName({ runtimeId: "codex", tools, displayNames: {}, providerName: "DeepSeek" }), "codex")
})

test("Enjoy 本地 / 还没定引擎：说供应商品牌名（调用方传 defaultProviderBrand 的结果）", () => {
  assert.equal(sendFailureProviderName({ runtimeId: "enjoy-local", tools, displayNames: {}, providerName: "DeepSeek" }), "DeepSeek")
  assert.equal(sendFailureProviderName({ runtimeId: null, tools, displayNames: {}, providerName: "DeepSeek" }), "DeepSeek")
})

// luna P2（定稿）：失败卡只说供应商 / 引擎名，密钥档案名（「Work key A」「E2E Stub Key」）哪儿都不出现，括号里也不要。
test("luna P2：Enjoy 本地四张失败卡（连不上 / 密钥没通过 / 拒绝 / 额度）中英都说 OpenAI，不出现档案名", async () => {
  const { defaultProviderBrand } = await import("./default-provider-label.ts")
  const { zhChat } = await import("../i18n/catalogs/zh/chat.ts")
  const { enChat } = await import("../i18n/catalogs/en/chat.ts")
  const readiness = { defaultRoute: { runtimeId: "enjoy-local", profileId: "prv_a" }, apiKeys: [] } as never
  for (const [profile, kind, brand] of [["Work key A", "openai", "OpenAI"], ["E2E Stub Key", "openai", "OpenAI"], ["我的 DS 钥匙", "deepseek", "DeepSeek"]] as const) {
    const providers = [{ id: "prv_a", name: profile, kind, active: true, hasKey: true }]
    const name = sendFailureProviderName({
      runtimeId: "enjoy-local",
      tools,
      displayNames: {},
      providerName: defaultProviderBrand(readiness, providers, zhChat.credentialProviderFallback)
    })
    assert.equal(name, brand)
    for (const cat of [zhChat, enChat] as Record<string, string>[]) {
      for (const key of ["credentialNetworkNotice", "credentialInvalidNotice", "credentialForbiddenNotice", "credentialBillingNotice", "providerUnreachableNotice"]) {
        const text = cat[key]!.replace("{name}", name)
        assert.ok(text.includes(brand), `${key}: ${text}`)
        assert.ok(!text.includes(profile), `${key} 出现了档案名：${text}`)
        assert.ok(!/[（(]/.test(text), `${key} 带了括号补充：${text}`)
      }
    }
  }
  assert.equal(zhChat.credentialInvalidNotice.replace("{name}", "OpenAI"), "密钥没通过：OpenAI 不认这把密钥，消息没发出去。")
  assert.equal(zhChat.credentialNetworkNotice.replace("{name}", "OpenAI"), "连不上 OpenAI，消息没发出去。检查网络后再试。")
})

test("接线：失败卡的 hook 取 defaultProviderBrand，不再用档案名（defaultProviderLabel 已删）", () => {
  const hook = readFileSync(new URL("../hooks/use-send-failure-provider-name.ts", import.meta.url), "utf8").replace(/\/\/.*$/gm, "")
  assert.match(hook, /providerName: defaultProviderBrand\(/)
  assert.ok(!/defaultProviderLabel|keyProfileName/.test(hook))
})

// 接线：三张失败卡都走 useSendFailureProviderName（node:test 渲染不了 .tsx，只能读源码）。
test("接线：连不上 / 密钥没通过 / 拒绝·额度 三张卡的 {name} 都跟前台引擎走", () => {
  for (const file of ["thread-credential-network-notice.tsx", "thread-credential-invalid-notice.tsx", "thread-credential-restricted-notice.tsx"]) {
    const src = readFileSync(new URL(`../components/ai-chat/thread/${file}`, import.meta.url), "utf8").replace(/\/\/.*$/gm, "")
    assert.match(src, /const name = useSendFailureProviderName\(\)/, file)
    assert.ok(!/name = defaultProviderLabel\(/.test(src), `${file} 又拿密钥档案名当 {name}`)
  }
  const hook = readFileSync(new URL("../hooks/use-send-failure-provider-name.ts", import.meta.url), "utf8")
  assert.match(hook, /runtimeId = useChatStore\(\(state\) => state\.runtimeId\)/)
  assert.match(hook, /sendFailureProviderName\(\{\s*runtimeId,/)
})
