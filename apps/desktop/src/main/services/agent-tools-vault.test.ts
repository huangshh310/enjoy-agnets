/**
 * 用户现象：绑定 Anthropic 档案后在抽屉里换模型，界面跳回「官方登录 · 已登录」。
 * upsert 只带 modelId 时，其余键是 undefined；展开进覆盖层会把绑定冲掉。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { mergeAgentToolOverride } from "./agent-tools-override-merge.ts"

test("只改模型不得冲掉 Enjoy 绑定", () => {
  const next = mergeAgentToolOverride(
    {
      useCustomProvider: true,
      providerId: "prv_anthropic",
      modelId: "deepseek-flash"
    },
    {
      enabled: undefined,
      binaryPath: undefined,
      extraArgs: undefined,
      modelId: "deepseek-v4-pro",
      providerId: undefined,
      useCustomProvider: undefined
    }
  )
  assert.equal(next.useCustomProvider, true)
  assert.equal(next.providerId, "prv_anthropic")
  assert.equal(next.modelId, "deepseek-v4-pro")
})

test("显式退回官方登录仍然生效", () => {
  const next = mergeAgentToolOverride(
    { useCustomProvider: true, providerId: "prv_anthropic", modelId: "deepseek-flash" },
    { useCustomProvider: false }
  )
  assert.equal(next.useCustomProvider, false)
  assert.equal(next.providerId, "prv_anthropic")
  assert.equal(next.modelId, "deepseek-flash")
})
