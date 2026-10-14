import assert from "node:assert/strict"
import { test } from "node:test"
import { presetFor } from "@enjoy-agents/providers/presets"
import { presetBillingUrl } from "./preset-console-url.ts"

test("充值链接：billingURL 优先，否则 keysURL；都没有给 undefined，不猜 docsURL", () => {
  const deepseek = presetFor("deepseek")
  assert.ok(deepseek.billingURL)
  assert.equal(presetBillingUrl("deepseek"), new URL(deepseek.billingURL!).toString())
  const groq = presetFor("groq")
  assert.equal(groq.billingURL, undefined)
  assert.equal(presetBillingUrl("groq"), new URL(groq.keysURL!).toString())
  assert.equal(presetBillingUrl("custom"), undefined)
  assert.equal(presetBillingUrl("not-a-real-kind"), undefined)
  assert.equal(presetBillingUrl(""), undefined)
  assert.equal(presetBillingUrl(undefined), undefined)
})

test("只放行 https：http: / javascript: / file: / 坏地址都不给按钮", async () => {
  const { billingUrlOf, safeHttpsUrl } = await import("./preset-console-url.ts")
  assert.equal(safeHttpsUrl("http://pay.example/top_up"), undefined)
  assert.equal(safeHttpsUrl("javascript:alert(1)"), undefined)
  assert.equal(safeHttpsUrl("JavaScript:alert(1)"), undefined)
  assert.equal(safeHttpsUrl("file:///etc/passwd"), undefined)
  assert.equal(safeHttpsUrl("not a url"), undefined)
  assert.equal(safeHttpsUrl("  https://pay.example/top_up  "), "https://pay.example/top_up")
  assert.equal(billingUrlOf({ billingURL: "http://pay.example", keysURL: "javascript:alert(1)" }), undefined)
  assert.equal(billingUrlOf({ billingURL: "javascript:alert(1)" }), undefined)
})

test("不安全的 billingURL 跳过，回落到 https 的 keysURL；https 的 billingURL 优先", async () => {
  const { billingUrlOf } = await import("./preset-console-url.ts")
  assert.equal(billingUrlOf({ billingURL: "http://pay.example/", keysURL: "https://keys.example/" }), "https://keys.example/")
  assert.equal(billingUrlOf({ billingURL: "javascript:alert(1)", keysURL: "https://keys.example/" }), "https://keys.example/")
  assert.equal(billingUrlOf({ billingURL: "https://pay.example/", keysURL: "https://keys.example/" }), "https://pay.example/")
  assert.equal(billingUrlOf({}), undefined)
})

test("所有内置预设的 billingURL / keysURL 都是 https（否则按钮会静默消失）", async () => {
  const { PROVIDER_PRESETS } = await import("@enjoy-agents/providers/presets")
  for (const preset of PROVIDER_PRESETS) {
    for (const url of [preset.billingURL, preset.keysURL]) {
      if (url) assert.match(url, /^https:\/\//, `${preset.kind}: ${url}`)
    }
  }
})
