/**
 * forbidden / billing 细分提示：徽标仍中性灰，只在文案与按钮上区分。回退任一分支都会红。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { presetFor } from "@enjoy-agents/providers/presets"
import { guideKeyHint, keyHintOf } from "./key-hint.ts"
import { renderKeyHint } from "./key-hint-view.ts"
import { guideKeyStatus, keyBadgeTone, keyStatusOf } from "./key-status.ts"
import { zhSettings } from "../../i18n/catalogs/zh/settings.ts"
import { enSettings } from "../../i18n/catalogs/en/settings.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const t = (key: string, vars?: Record<string, string>) => (vars?.name ? `${key}:${vars.name}` : key)

function actionButton(el: ReactElement | null): { onClick: (e: { stopPropagation: () => void }) => void } | undefined {
  const kids = (el?.props as { children?: unknown[] })?.children ?? []
  const btn = kids.find((kid) => (kid as ReactElement | null)?.type === "button") as ReactElement | undefined
  return btn?.props as { onClick: (e: { stopPropagation: () => void }) => void } | undefined
}

test("forbidden / billing 仍是三态里的 unverified，徽标中性灰", () => {
  for (const code of ["forbidden", "billing"] as const) {
    const check = { state: "unverified" as const, code }
    assert.equal(keyStatusOf(check), "unverified")
    assert.equal(keyBadgeTone(keyStatusOf(check)), "neutral")
  }
})

test("只按 raw code 出提示；ok / invalid / network / 没 code 不出", () => {
  assert.deepEqual(keyHintOf({ state: "unverified", code: "forbidden" }, "openai"), { kind: "forbidden" })
  assert.deepEqual(keyHintOf({ state: "unverified", code: "billing" }, "deepseek"), {
    kind: "billing",
    url: new URL(presetFor("deepseek").billingURL!).toString()
  })
  assert.deepEqual(keyHintOf({ state: "unverified", code: "billing" }, "groq"), {
    kind: "billing",
    url: new URL(presetFor("groq").keysURL!).toString()
  })
  assert.deepEqual(keyHintOf({ state: "unverified", code: "billing" }, "custom"), { kind: "billing" })
  assert.equal(keyHintOf({ state: "unverified", code: "network" }, "openai"), undefined)
  assert.equal(keyHintOf({ state: "unverified" }, "openai"), undefined)
  assert.equal(keyHintOf({ state: "invalid", code: "auth_rejected" }, "openai"), undefined)
  assert.equal(keyHintOf({ state: "ok" }, "openai"), undefined)
  assert.equal(keyHintOf({ state: "invalid", code: "forbidden" }, "openai"), undefined)
  assert.equal(keyHintOf({ state: "ok", code: "billing" }, "deepseek"), undefined)
  assert.equal(keyHintOf(undefined, "openai"), undefined)
})

test("forbidden：文案 + 改密钥，点按钮走 onEdit 不开浏览器", () => {
  let edited = 0
  const opened: string[] = []
  const el = renderKeyHint({ kind: "forbidden" }, { kind: "named", name: "OpenAI" }, t, { onEdit: () => edited++, onOpenUrl: (u) => opened.push(u) })
  const out = renderToStaticMarkup(el!)
  assert.match(out, /data-hint-kind="forbidden"/)
  assert.match(out, /settings\.providers\.keyForbiddenHint/)
  assert.match(out, /settings\.providers\.fixKey/)
  assert.doesNotMatch(out, /topUp/)
  actionButton(el)!.onClick({ stopPropagation: () => undefined })
  assert.equal(edited, 1)
  assert.deepEqual(opened, [])
})

test("billing：带显示名；有链接给去充值并打开该链接，没链接只给文案", () => {
  let edited = 0
  const opened: string[] = []
  const el = renderKeyHint({ kind: "billing", url: "https://pay.example/" }, { kind: "named", name: "DeepSeek" }, t, {
    onEdit: () => edited++,
    onOpenUrl: (u) => opened.push(u)
  })
  const out = renderToStaticMarkup(el!)
  assert.match(out, /settings\.providers\.keyBillingHint:DeepSeek/)
  assert.match(out, /settings\.providers\.topUp/)
  actionButton(el)!.onClick({ stopPropagation: () => undefined })
  assert.deepEqual(opened, ["https://pay.example/"])
  assert.equal(edited, 0)
  const bare = renderToStaticMarkup(renderKeyHint({ kind: "billing" }, { kind: "named", name: "Mine" }, t, { onEdit() {}, onOpenUrl() {} })!)
  assert.match(bare, /keyBillingHint:Mine/)
  assert.doesNotMatch(bare, /<button/)
})

test("向导：和 guideKeyStatus 同一档案，默认路线命中读 readiness.credentialCheck", () => {
  const readiness = {
    apiKeys: [
      { providerId: "p1", presetId: "deepseek" },
      { providerId: "p2", presetId: "openai" }
    ],
    defaultRoute: { profileId: "p1" },
    credentialCheck: { state: "unverified", code: "billing" }
  } as unknown as Parameters<typeof guideKeyStatus>[0]
  const providers = [
    { id: "p1", kind: "deepseek", name: "ds", credentialCheck: { state: "ok" as const } },
    { id: "p2", kind: "openai", name: "oa" }
  ]
  const got = guideKeyHint(readiness, providers, guideKeyStatus(readiness, providers))
  assert.equal(got?.hint.kind, "billing")
  assert.deepEqual(got?.provider, { kind: "named", name: "DeepSeek" })
  const forbidden = { ...readiness, credentialCheck: { state: "unverified", code: "forbidden" } } as typeof readiness
  assert.equal(guideKeyHint(forbidden, providers, guideKeyStatus(forbidden, providers))?.hint.kind, "forbidden")
  const ok = { ...readiness, credentialCheck: { state: "ok" } } as typeof readiness
  assert.equal(guideKeyHint(ok, providers, guideKeyStatus(ok, providers)), undefined)
})

test("中英文案钉死，英文以句号结尾", () => {
  const zh = (zhSettings as { providers: Record<string, string> }).providers
  const en = (enSettings as { providers: Record<string, string> }).providers
  assert.equal(zh.keyForbiddenHint, "这把密钥没有权限用这个模型，换一把或换个模型。")
  assert.equal(zh.keyBillingHint, "{name} 账户余额不足，充值后再试。")
  assert.equal(zh.keyBillingHintGeneric, "模型服务账户余额不足，充值后再试。")
  assert.equal(en.keyBillingHintGeneric, "The model service account is out of credit. Top up and try again.")
  assert.equal(zh.topUp, "去充值")
  assert.equal(zh.fixKey, "改密钥")
  assert.match(en.keyForbiddenHint, /\.$/)
  assert.match(en.keyBillingHint, /\{name\}.*\.$/)
})

test("设置行与向导行都接上提示，链接走现有 window.openExternal 安全通道", () => {
  const row = readFileSync(join(dir, "../../components/settings/providers/provider-configured-row.tsx"), "utf8")
  const step = readFileSync(join(dir, "../../components/setup-guide/connect-model-step.tsx"), "utf8")
  for (const src of [row, step]) {
    assert.match(src, /onOpenUrl: requestOpenExternalQuiet/)
    assert.doesNotMatch(src, /window\.open\s*\(/)
  }
  assert.match(row, /renderProviderKeyHint\(profile, t, \{ onEdit, onOpenUrl: requestOpenExternalQuiet \}\)/)
  assert.match(row, /\{keyHint\}/)
  assert.match(step, /renderKeyHint\(/)
  assert.match(step, /guideKeyHint\(readiness, providers, guideKeyStatus\(readiness, providers\)\)/)
})

test("billing：档案指到代理 / 中转（不是这家官方地址）→ 不给「去充值」链接，只给文案（luna #164）", () => {
  const billing = { state: "unverified" as const, code: "billing" as const }
  const official = new URL(presetFor("deepseek").billingURL!).toString()
  // 没填端点 / 官方地址（含子域、端口）照旧给链接
  for (const baseURL of [undefined, "", "https://api.deepseek.com/v1", "https://foo.deepseek.com:8443/anthropic"]) {
    assert.deepEqual(keyHintOf(billing, "deepseek", baseURL), { kind: "billing", url: official }, String(baseURL))
  }
  // 代理 / 仿冒 / 解析不了 → 只给文案
  for (const baseURL of ["https://proxy.example.com/v1", "https://deepseek.com.evil.com/v1", "https://api.deepseek.com@evil.com/v1", "api.deepseek.com/v1"]) {
    assert.deepEqual(keyHintOf(billing, "deepseek", baseURL), { kind: "billing" }, baseURL)
  }
  // 向导行同样按档案的端点判断
  const readiness = {
    apiKeys: [{ providerId: "p1", presetId: "deepseek" }],
    defaultRoute: { profileId: "p1" },
    credentialCheck: billing
  } as unknown as Parameters<typeof guideKeyStatus>[0]
  const proxied = [{ id: "p1", kind: "deepseek", name: "ds", baseURL: "https://relay.example.cn/v1" }]
  assert.deepEqual(guideKeyHint(readiness, proxied, guideKeyStatus(readiness, proxied))?.hint, { kind: "billing" })
  const direct = [{ id: "p1", kind: "deepseek", name: "ds", baseURL: "https://api.deepseek.com/v1" }]
  assert.deepEqual(guideKeyHint(readiness, direct, guideKeyStatus(readiness, direct))?.hint, { kind: "billing", url: official })
})

// 真文案：settings.* 读设置目录，chat.* 读聊天目录（「模型服务」回落），和全局 t 一样
import { zhChat } from "../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../i18n/catalogs/en/chat.ts"
import { keyHolderFace, guideKeyStatus as guideStatus } from "./key-status.ts"
import { renderProviderKeyHint, renderProviderKeyStatus } from "../../components/settings/providers/provider-key-status-text.ts"
function realT(settings: unknown, chat: unknown) {
  return (path: string, vars?: Record<string, string | number>) => {
    const [ns, ...rest] = path.split(".")
    let node: any = ns === "chat" ? chat : ns === "settings" ? settings : undefined
    for (const key of ns === "chat" ? [rest.join(".")] : rest) node = node?.[key]
    return String(node ?? path).replace(/\{(\w+)\}/g, (_m, k) => String(vars?.[k] ?? ""))
  }
}
const zhT = realT(zhSettings, zhChat)
const enT = realT(enSettings, enChat)
const text = (el: ReactElement | null) => renderToStaticMarkup(el!).replace(/<[^>]+>/g, "")

test("luna #164 S1：代理档案的余额提示说主机名 / 「模型服务」，不说预设品牌（中英）", () => {
  const billing = { state: "unverified" as const, code: "billing" as const }
  const actions = { onEdit() {}, onOpenUrl() {} }
  const row = (baseURL?: string) => ({ kind: "deepseek", name: "mine", requiresKey: true, hasKey: true, credentialCheck: billing, ...(baseURL === undefined ? {} : { baseURL }) })
  // 官方 / 没填：照旧说品牌
  assert.equal(text(renderProviderKeyHint(row(), zhT, actions)), "DeepSeek 账户余额不足，充值后再试。去充值")
  assert.equal(text(renderProviderKeyHint(row("https://api.deepseek.com/v1"), enT, actions)), "Your DeepSeek account is out of credit. Top up and try again.Top up")
  // 代理：主机名（不带端口 / 路径），中文空格按 placeProviderName，没有充值按钮
  assert.equal(text(renderProviderKeyHint(row("https://proxy.example.com:8443/v1"), zhT, actions)), "proxy.example.com 账户余额不足，充值后再试。")
  assert.equal(text(renderProviderKeyHint(row("https://proxy.example.com:8443/v1"), enT, actions)), "Your proxy.example.com account is out of credit. Top up and try again.")
  // 解析不了：「模型服务」
  assert.equal(text(renderProviderKeyHint(row("proxy.example.com/v1"), zhT, actions)), "模型服务账户余额不足，充值后再试。")
  assert.equal(text(renderProviderKeyHint(row("proxy.example.com/v1"), enT, actions)), "The model service account is out of credit. Top up and try again.")
  // 中文品牌：两边按中文判断
  const qwen = { ...row("https://relay.example.cn/v1"), kind: "qwen" }
  assert.match(text(renderProviderKeyHint({ ...qwen, baseURL: undefined }, zhT, actions)), /^通义千问 \(Qwen \/ DashScope\) 账户余额不足，充值后再试。/)
  assert.equal(text(renderProviderKeyHint(qwen, zhT, actions)), "relay.example.cn 账户余额不足，充值后再试。")
  // 中文结尾的称呼（custom 档案名）：挨中文不留空格——空格一定走 placeProviderName
  const cjk = { ...row(), kind: "custom", name: "我的中转" }
  assert.equal(text(renderProviderKeyHint(cjk, zhT, actions)), "我的中转账户余额不足，充值后再试。")
  assert.match(text(renderProviderKeyStatus({ ...cjk, credentialCheck: { state: "invalid" as const } }, zhT, () => undefined)), /^密钥被我的中转拒绝了，换一个再试/)
})

test("luna #164 S1：代理档案的密钥状态（被拒）和向导第 4 步 / 完成页同样说主机名", () => {
  const invalid = { state: "invalid" as const }
  const p = (baseURL?: string) => ({ kind: "openai", name: "mine", requiresKey: true, hasKey: true, credentialCheck: invalid, ...(baseURL ? { baseURL } : {}) })
  assert.match(text(renderProviderKeyStatus(p(), zhT, () => undefined)), /^密钥被 OpenAI 拒绝了，换一个再试/)
  assert.match(text(renderProviderKeyStatus(p("https://gw.example.com/v1"), zhT, () => undefined)), /^密钥被 gw\.example\.com 拒绝了，换一个再试/)
  assert.match(text(renderProviderKeyStatus(p("gw.example.com/v1"), zhT, () => undefined)), /^密钥被模型服务拒绝了，换一个再试/)
  assert.match(text(renderProviderKeyStatus(p("gw.example.com/v1"), enT, () => undefined)), /^The model service rejected this key\. Try another one/)
  // 向导：guideKeyStatus.providerName（第 4 步行提示、完成页标题 / 摘要都读它）
  const readiness = { apiKeys: [{ providerId: "p1", presetId: "openai" }], defaultRoute: { profileId: "p1" }, credentialCheck: invalid } as unknown as Parameters<typeof guideStatus>[0]
  assert.equal(guideStatus(readiness, [{ id: "p1", kind: "openai", name: "mine" }])?.providerName, "OpenAI")
  assert.equal(guideStatus(readiness, [{ id: "p1", kind: "openai", name: "mine", baseURL: "https://gw.example.com/v1" }])?.providerName, "gw.example.com")
  assert.equal(guideStatus(readiness, [{ id: "p1", kind: "openai", name: "mine", baseURL: "gw.example.com/v1" }])?.providerName, undefined, "解析不了 → 调用方回落词")
  // 向导第 4 步余额提示
  const billingReady = { ...readiness, credentialCheck: { state: "unverified", code: "billing" } } as typeof readiness
  const proxied = [{ id: "p1", kind: "openai", name: "mine", baseURL: "https://gw.example.com/v1" }]
  const got = guideKeyHint(billingReady, proxied, guideStatus(billingReady, proxied))!
  assert.equal(text(renderKeyHint(got.hint, got.provider, zhT, { onEdit() {}, onOpenUrl() {} })), "gw.example.com 账户余额不足，充值后再试。")
})

test("keyHolderFace：官方 / 空 → 显示名；代理 → 主机名；解析不了 → 通用；custom 档案说档案名（luna #164 第 3 轮）", () => {
  assert.deepEqual(keyHolderFace("deepseek", "mine"), { kind: "named", name: "DeepSeek" })
  assert.deepEqual(keyHolderFace("deepseek", "mine", "https://api.deepseek.com/v1"), { kind: "named", name: "DeepSeek" })
  assert.deepEqual(keyHolderFace("deepseek", "mine", "https://relay.example.cn/v1"), { kind: "named", name: "relay.example.cn" })
  assert.deepEqual(keyHolderFace("deepseek", "mine", "relay"), { kind: "generic" })
  assert.deepEqual(keyHolderFace("custom", "My Relay", "https://relay.example.cn/v1"), { kind: "named", name: "My Relay" })
  assert.deepEqual(keyHolderFace("custom", "  My Relay  "), { kind: "named", name: "My Relay" })
  assert.deepEqual(keyHolderFace("custom", "   ", "https://relay.example.cn:8443/v1"), { kind: "named", name: "relay.example.cn" })
  assert.deepEqual(keyHolderFace("custom", "", "relay"), { kind: "generic" })
  assert.deepEqual(keyHolderFace("custom", ""), { kind: "generic" }, "不说预设 id custom")
  assert.deepEqual(keyHolderFace("ollama", "", "http://0.0.0.0:11434/v1"), { kind: "named", name: "Ollama" })
})

test("leo S2：充值链接换第二家预设（OpenAI）同样只在官方地址给", () => {
  const billing = { state: "unverified" as const, code: "billing" as const }
  const official = new URL(presetFor("openai").billingURL!).toString()
  for (const baseURL of [undefined, "https://api.openai.com/v1", "https://eu.api.openai.com/v1"]) {
    assert.deepEqual(keyHintOf(billing, "openai", baseURL), { kind: "billing", url: official }, String(baseURL))
  }
  for (const baseURL of ["https://api.openai.com.evil.com/v1", "http://localhost:8080/v1", "https://api..openai.com/v1", "https://api.deepseek.com/v1"]) {
    assert.deepEqual(keyHintOf(billing, "openai", baseURL), { kind: "billing" }, baseURL)
  }
  // 第三家：z.ai 只认 api.z.ai，用户 space 子域不给链接
  assert.equal(keyHintOf(billing, "zai", "https://abc-deploy.space.z.ai/v1")?.kind, "billing")
  assert.equal((keyHintOf(billing, "zai", "https://abc-deploy.space.z.ai/v1") as { url?: string }).url, undefined)
})

import { KEY_HOLDER_GENERIC_KEYS, fillKeyHolderText } from "./key-status.ts"
test("luna #164 第 3 轮 1：只有带「密钥」的引导文案（第 4 步行提示、完成页标题 / 摘要）回落「供应商」/ the provider，别处都是「模型服务」", () => {
  const keyed = ["settings.setupGuide.connectApiKeyInvalidHint", "settings.setupGuide.readyKeyInvalidTitle", "settings.setupGuide.readyKeyInvalidHint"]
  for (const key of keyed) {
    assert.match(zhT(key), /密钥/, key)
    assert.match(enT(key), /\bkey\b/, key)
  }
  // 回落：中文「供应商」两边不留空格；英文句首 The provider、句中 the provider
  assert.deepEqual(keyed.map((key) => fillKeyHolderText(zhT, key, undefined)), ["密钥被供应商拒绝了，换一个再试", "密钥被供应商拒绝了", "换一个供应商密钥再试，改好就能开始"])
  assert.deepEqual(keyed.map((key) => fillKeyHolderText(enT, key, undefined)), ["The provider rejected this key. Try another one", "The provider rejected your key", "Use a different the provider key and you're ready to go"])
  // 有名字：拉丁留空格、中文不留
  assert.deepEqual(keyed.map((key) => fillKeyHolderText(zhT, key, "OpenAI")), ["密钥被 OpenAI 拒绝了，换一个再试", "密钥被 OpenAI 拒绝了", "换一个 OpenAI 密钥再试，改好就能开始"])
  assert.deepEqual(keyed.map((key) => fillKeyHolderText(zhT, key, "我的网关")), ["密钥被我的网关拒绝了，换一个再试", "密钥被我的网关拒绝了", "换一个我的网关密钥再试，改好就能开始"])
  assert.equal(fillKeyHolderText(zhT, "settings.setupGuide.readyTitle", undefined), zhT("settings.setupGuide.readyTitle"), "没名字槽的标题原样")
  assert.deepEqual(KEY_HOLDER_GENERIC_KEYS, { start: "settings.setupGuide.providerFallback", mid: "settings.setupGuide.providerFallbackMid" })
  // 别处（设置行、失败卡）照旧「模型服务」
  const p = { kind: "openai", name: "mine", requiresKey: true, hasKey: true, credentialCheck: { state: "invalid" as const }, baseURL: "gw.example.com/v1" }
  assert.match(text(renderProviderKeyStatus(p, zhT, () => undefined)), /^密钥被模型服务拒绝了/)
  assert.match(text(renderProviderKeyStatus(p, enT, () => undefined)), /^The model service rejected this key/)
  // 接线：引导三处都走 fillKeyHolderText，不再自己拼 providerFallback；别的文件不用「供应商」回落
  const src = (rel: string) => readFileSync(join(dir, rel), "utf8").replace(/\/\/.*$/gm, "")
  const step = src("../../components/setup-guide/connect-model-step.tsx")
  assert.match(step, /fillKeyHolderText\(t as [^,]+, key, option\.providerName\)/)
  assert.match(src("../../components/setup-guide/ready-summary.tsx"), /fillKeyHolderText\([^)]*"settings\.setupGuide\.readyKeyInvalidHint", keyStatus\.providerName\)/)
  const dialog = src("../../components/setup-guide/setup-guide-dialog.tsx")
  assert.match(dialog, /title=\{\s*step === "ready" && keyStatus\s*\? fillKeyHolderText\(/)
  assert.match(src("../../components/setup-guide/setup-guide-header.tsx"), /\{title \?\? t\(titleKey \?\? face\.title\)\}/, "标题优先用填好名字的 title")
  for (const file of [step, dialog, src("../../components/setup-guide/ready-summary.tsx"), src("../../components/settings/providers/provider-key-status-text.ts")]) {
    assert.ok(!/t\("settings\.setupGuide\.providerFallback"\)/.test(file), "不再直接拿回落词塞进 {name}")
  }
  assert.ok(!/providerFallback/.test(src("../../components/settings/providers/provider-key-status-text.ts")))
})

test("luna #164 第 3 轮 2：自定义档案在设置行 / 余额提示 / 向导都说档案名（去空白、≤30 字）；名字空 → 主机名 → 通用", () => {
  const actions = { onEdit() {}, onOpenUrl() {} }
  const billing = { state: "unverified" as const, code: "billing" as const }
  const invalid = { state: "invalid" as const }
  const c = (name: string, baseURL?: string, check: object = billing) => ({ kind: "custom", name, requiresKey: true, hasKey: true, credentialCheck: check, ...(baseURL ? { baseURL } : {}) })
  assert.equal(text(renderProviderKeyHint(c(" Team Relay ", "https://relay.example.cn/v1"), zhT, actions)), "Team Relay 账户余额不足，充值后再试。")
  assert.equal(text(renderProviderKeyHint(c("我的网关", "relay"), enT, actions)), "Your 我的网关 account is out of credit. Top up and try again.")
  assert.equal(text(renderProviderKeyHint(c("", "https://relay.example.cn:8443/v1"), zhT, actions)), "relay.example.cn 账户余额不足，充值后再试。")
  assert.equal(text(renderProviderKeyHint(c(" ", "relay"), zhT, actions)), "模型服务账户余额不足，充值后再试。")
  assert.match(text(renderProviderKeyStatus(c("我的网关", "https://relay.example.cn/v1", invalid), zhT, () => undefined)), /^密钥被我的网关拒绝了，换一个再试/)
  assert.match(text(renderProviderKeyStatus(c("", "https://relay.example.cn/v1", invalid), zhT, () => undefined)), /^密钥被 relay\.example\.cn 拒绝了/)
  const long = "abcdefghijklmnopqrstuvwxyz0123456789"
  assert.match(text(renderProviderKeyStatus(c(long, undefined, invalid), zhT, () => undefined)), /^密钥被 abcdefghijklmnopqrstuvwxyz012… 拒绝了/)
  // 向导：providerName 给档案名；名字空看主机名；都没有 → undefined（调用方说「供应商」，不说预设 id custom）
  const readiness = { apiKeys: [{ providerId: "p1", presetId: "custom" }], defaultRoute: { profileId: "p1" }, credentialCheck: invalid } as unknown as Parameters<typeof guideStatus>[0]
  assert.equal(guideStatus(readiness, [{ id: "p1", kind: "custom", name: " 我的网关 ", baseURL: "https://relay.example.cn/v1" }])?.providerName, "我的网关")
  assert.equal(guideStatus(readiness, [{ id: "p1", kind: "custom", name: "", baseURL: "https://relay.example.cn/v1" }])?.providerName, "relay.example.cn")
  assert.equal(guideStatus(readiness, [{ id: "p1", kind: "custom", name: "", baseURL: "relay" }])?.providerName, undefined)
  assert.equal(guideStatus(readiness, [])?.providerName, undefined, "档案对不上也不说 custom")
  assert.equal(fillKeyHolderText(zhT, "settings.setupGuide.readyKeyInvalidTitle", guideStatus(readiness, [])?.providerName), "密钥被供应商拒绝了")
  // 预设档案的档案名照旧不出现
  assert.equal(guideStatus({ ...readiness, apiKeys: [{ providerId: "p1", presetId: "openai" }] } as typeof readiness, [{ id: "p1", kind: "openai", name: "我的网关", baseURL: "https://gw.example.com/v1" }])?.providerName, "gw.example.com")
})
