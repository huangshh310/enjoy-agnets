/**
 * mike P3（英文 733）：「已交接」短提示不露中文「Enjoy 本地」，有排队项时让位不盖排队区。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { handoffBannerVisible, handoffEngineLabel } from "./handoff-labels.ts"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"

const tools = [
  { id: "enjoy-local", label: "Enjoy 本地" },
  { id: "amp", label: "Amp" }
]

test("Enjoy 本地一律用 i18n 名（英文 Enjoy Local），不用主进程中文工具名；其它引擎用工具名、找不到用 id", () => {
  assert.equal(handoffEngineLabel(tools, "enjoy-local", "Enjoy Local"), "Enjoy Local")
  assert.equal(handoffEngineLabel(tools, "amp", "Enjoy Local"), "Amp")
  assert.equal(handoffEngineLabel(tools, "grok", "Enjoy Local"), "grok")
  assert.equal(handoffEngineLabel(tools, null, "Enjoy Local"), "")
  assert.equal(enChat.usage.enjoyLocal, "Enjoy Local")
})

test("有排队项时短提示不画（换助手后队列停着，说明行已写「你换了助手」）；没有排队才画；别的会话的提示不画", () => {
  assert.equal(handoffBannerVisible({ bannerForThisSession: true, queuedCount: 0 }), true)
  assert.equal(handoffBannerVisible({ bannerForThisSession: true, queuedCount: 1 }), false)
  assert.equal(handoffBannerVisible({ bannerForThisSession: false, queuedCount: 0 }), false)
})

test("接线：交接坞用 handoffEngineLabel；短提示按本会话计时（让位时也过期，排队清空后不冒出过时提示）", () => {
  const dock = readFileSync(new URL("./engine-handoff-dock.tsx", import.meta.url), "utf8")
  assert.match(dock, /handoffEngineLabel\(tools, fromId, t\("chat\.usage\.enjoyLocal"\)\)/)
  assert.doesNotMatch(dock, /function labelFor/)
  const banner = readFileSync(new URL("./engine-handoff-banner.tsx", import.meta.url), "utf8")
  assert.match(banner, /handoffBannerVisible\(\{ bannerForThisSession: forThisSession, queuedCount \}\)/)
  assert.match(banner, /if \(!forThisSession\) return\s+const timer = window\.setTimeout\(dismissBanner, TOAST_MS\)/)
})
