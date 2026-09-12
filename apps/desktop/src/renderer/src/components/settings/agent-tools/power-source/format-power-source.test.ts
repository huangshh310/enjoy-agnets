/**
 * 列表文案：可绑 / 仅官方 / OMP 各走自己的槽，Cursor 不能缺字。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { PowerSourceParts } from "@enjoy-agents/ipc-contract"
import { formatPowerSourceText } from "./format-power-source.ts"

const copy: Record<string, string> = {
  "settings.agentTools.officialLogin": "官方登录",
  "settings.agentTools.accountSignedIn": "已登录",
  "settings.agentTools.listOfficialOut": "未登录",
  "settings.agentTools.listOfficialCheck": "检测中",
  "settings.agentTools.listOfficialAuth": "授权中",
  "settings.agentTools.listOfficialFail": "失败",
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
  const parts: PowerSourceParts = {
    kind: "official",
    present: true,
    mode: "official",
    official: "in"
  }
  const text = formatPowerSourceText(parts, t)
  assert.equal(text, "官方登录 · 已登录")
  assert.ok(!text.includes("供应商"))
})

test("可绑与 Enjoy 本地是供应商 · 档案 · 模型", () => {
  assert.equal(
    formatPowerSourceText(
      {
        kind: "bindable",
        present: true,
        mode: "vault",
        archive: "deep",
        model: "deepseek-v4-pro"
      },
      t
    ),
    "供应商 · deep · deepseek-v4-pro"
  )
  assert.equal(
    formatPowerSourceText(
      {
        kind: "enjoy-vault",
        present: true,
        mode: "vault",
        archive: "lucky0625",
        model: "deepseek-v4-flash"
      },
      t
    ),
    "供应商 · lucky0625 · deepseek-v4-flash"
  )
})

test("OMP 文案前缀不是 Enjoy 供应商", () => {
  const text = formatPowerSourceText(
    {
      kind: "omp",
      present: true,
      mode: "omp",
      archive: "default",
      model: "google-antigravity"
    },
    t
  )
  assert.equal(text, "OMP 供应商 · default · google-antigravity")
  assert.ok(!text.startsWith("供应商 ·"))
})

test("空档案不假装有 vault", () => {
  assert.equal(
    formatPowerSourceText({ kind: "enjoy-vault", present: true, mode: "vault" }, t),
    "—"
  )
})

test("官方检测中用列表文案", () => {
  assert.equal(
    formatPowerSourceText(
      { kind: "official", present: true, mode: "official", official: "check" },
      t
    ),
    "官方登录 · 检测中"
  )
})

test("官方授权中 / 失败仍是官方登录 ·", () => {
  assert.equal(
    formatPowerSourceText(
      { kind: "official", present: true, mode: "official", official: "auth" },
      t
    ),
    "官方登录 · 授权中"
  )
  assert.equal(
    formatPowerSourceText(
      { kind: "official", present: true, mode: "official", official: "fail" },
      t
    ),
    "官方登录 · 失败"
  )
})
