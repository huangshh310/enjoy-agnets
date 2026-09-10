/**
 * 列表文案：可绑 / 仅官方 / OMP 各走自己的槽，Cursor 不能缺字。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { describePowerSource } from "@enjoy-agents/ipc-contract"
import { formatPowerSourceText } from "./format-power-source.ts"

const copy: Record<string, string> = {
  "settings.agentTools.officialLogin": "官方登录",
  "settings.agentTools.accountSignedIn": "已登录",
  "settings.agentTools.accountNeedsLogin": "未登录",
  "settings.agentTools.accountChecking": "检测",
  "settings.agentTools.boundSummary": "供应商 · {provider} · {model}",
  "settings.agentTools.ompSummary": "OMP 供应商 · {provider} · {model}"
}

function t(key: string, vars?: Record<string, string | number>): string {
  let text = copy[key] ?? key
  for (const [name, value] of Object.entries(vars ?? {})) {
    text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}

test("Cursor / Grok 列表动力源是官方登录，不是供应商档案", () => {
  for (const runtimeId of ["cursor", "grok"]) {
    const text = formatPowerSourceText(
      describePowerSource({ runtimeId, loggedIn: true, useCustomProvider: true, boundProviderName: "lucky" }),
      t
    )
    assert.equal(text, "官方登录 · 已登录")
    assert.ok(!text.includes("供应商"))
  }
})

test("可绑与 Enjoy 本地是供应商 · 档案 · 模型", () => {
  assert.equal(
    formatPowerSourceText(
      describePowerSource({
        runtimeId: "claude",
        useCustomProvider: true,
        boundProviderName: "deep",
        selectedModel: "deepseek-v4-pro"
      }),
      t
    ),
    "供应商 · deep · deepseek-v4-pro"
  )
  assert.equal(
    formatPowerSourceText(
      describePowerSource({
        runtimeId: "enjoy-local",
        enjoyArchive: "lucky0625",
        enjoyModel: "deepseek-v4-flash"
      }),
      t
    ),
    "供应商 · lucky0625 · deepseek-v4-flash"
  )
})

test("OMP 文案前缀不是 Enjoy 供应商", () => {
  const text = formatPowerSourceText(
    describePowerSource({
      runtimeId: "omp",
      ompSupplier: "default",
      ompModel: "google-antigravity",
      enjoyArchive: "lucky0625"
    }),
    t
  )
  assert.equal(text, "OMP 供应商 · default · google-antigravity")
  assert.ok(!text.startsWith("供应商 ·"))
})
