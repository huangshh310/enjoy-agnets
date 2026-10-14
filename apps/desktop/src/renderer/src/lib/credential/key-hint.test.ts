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
  const el = renderKeyHint({ kind: "forbidden" }, "OpenAI", t, { onEdit: () => edited++, onOpenUrl: (u) => opened.push(u) })
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
  const el = renderKeyHint({ kind: "billing", url: "https://pay.example/" }, "DeepSeek", t, {
    onEdit: () => edited++,
    onOpenUrl: (u) => opened.push(u)
  })
  const out = renderToStaticMarkup(el!)
  assert.match(out, /settings\.providers\.keyBillingHint:DeepSeek/)
  assert.match(out, /settings\.providers\.topUp/)
  actionButton(el)!.onClick({ stopPropagation: () => undefined })
  assert.deepEqual(opened, ["https://pay.example/"])
  assert.equal(edited, 0)
  const bare = renderToStaticMarkup(renderKeyHint({ kind: "billing" }, "Mine", t, { onEdit() {}, onOpenUrl() {} })!)
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
  assert.equal(got?.providerName, "DeepSeek")
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
