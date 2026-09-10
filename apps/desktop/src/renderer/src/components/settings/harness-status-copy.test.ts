/**
 * 沙箱状态只信标志位，不把品牌缺词或 blockedReason 原文摊出来。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { harnessStatusCopy } from "./harness-status-copy.ts"

function t(path: string): string {
  const table: Record<string, string> = {
    "settings.harness.none": "无",
    "settings.harness.ready": "已可运行此适配器。",
    "settings.harness.needProviderKey": "先在模型供应商保存 Key。",
    "settings.harness.sandboxSaved": "隔离令牌已配置",
    "settings.harness.sandboxMissing": "缺少隔离令牌（隔离环境，不是模型密钥）",
    "common.providersKey": "供应商 Key",
    "common.noProviderKey": "无供应商 Key"
  }
  return table[path] ?? path
}

const base = {
  adapterId: "claude-code",
  adapterLabel: "Claude Code",
  available: true,
  comingSoon: false,
  needsSandbox: true,
  usesProviderKey: true,
  hasProviderKey: true,
  hasSandboxToken: false,
  ready: false,
  blockedReason: "This adapter still needs a Vercel Sandbox token (jail, not the model).",
  hasAnthropicKey: true,
  hasVercelToken: false,
  catalog: []
}

test("缺隔离令牌用人话，不用品牌缺词", () => {
  const copy = harnessStatusCopy(base, t)
  assert.equal(copy.description, "缺少隔离令牌（隔离环境，不是模型密钥）")
  assert.ok(copy.summary.includes("隔离令牌"))
  assert.ok(!copy.description.includes("Vercel"))
  assert.ok(!copy.summary.includes("Vercel"))
})

test("令牌已配置时摘要写已配置", () => {
  const copy = harnessStatusCopy({ ...base, hasSandboxToken: true, ready: true, blockedReason: null }, t)
  assert.equal(copy.description, "已可运行此适配器。")
  assert.ok(copy.summary.includes("隔离令牌已配置"))
})
