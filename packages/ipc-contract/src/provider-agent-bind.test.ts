import assert from "node:assert/strict"
import { test } from "node:test"
import {
  agentRefsForProvider,
  alsoUseTargets,
  composeAgentModels,
  createTargetForBind,
  pickBoundModelId,
  resolveBoundAgentModels,
  groupProvidersForBind,
  protocolNameForBind,
  providersCompatibleWith,
  providersSelectableFor
} from "./provider-agent-bind.ts"

test("Claude 不收 openai custom；Codex 不收 anthropic", () => {
  assert.equal(
    providersCompatibleWith("claude", { apiStyle: "openai", kind: "custom" }),
    false
  )
  assert.equal(
    providersCompatibleWith("claude", { apiStyle: "anthropic", kind: "custom" }),
    true
  )
  assert.equal(
    providersCompatibleWith("codex", { apiStyle: "anthropic", kind: "anthropic" }),
    false
  )
  assert.equal(
    providersCompatibleWith("codex", { apiStyle: "openai-responses", kind: "custom" }),
    true
  )
  assert.equal(providersCompatibleWith("cursor", { apiStyle: "openai", kind: "openai" }), false)
})

test("Gemini 只收 google 档案；Google 的 openai apiStyle 不进 Codex", () => {
  assert.equal(providersCompatibleWith("gemini", { apiStyle: "openai", kind: "google" }), true)
  assert.equal(providersCompatibleWith("gemini", { apiStyle: "openai", kind: "custom" }), false)
  assert.equal(providersCompatibleWith("codex", { apiStyle: "openai", kind: "google" }), false)
})

test("OpenCode 可收 openai / anthropic / google", () => {
  assert.equal(providersCompatibleWith("opencode", { apiStyle: "openai", kind: "custom" }), true)
  assert.equal(providersCompatibleWith("opencode", { apiStyle: "anthropic", kind: "anthropic" }), true)
  assert.equal(providersCompatibleWith("opencode", { kind: "google" }), true)
})

test("DeepSeek 可收 deepseek 档案与 OpenAI-compatible 档案", () => {
  assert.equal(providersCompatibleWith("deepseek", { apiStyle: "openai", kind: "deepseek" }), true)
  assert.equal(providersCompatibleWith("deepseek", { apiStyle: "openai", kind: "custom" }), true)
  assert.equal(providersCompatibleWith("deepseek", { apiStyle: "openai", kind: "openai" }), true)
  assert.equal(providersCompatibleWith("deepseek", { apiStyle: "openai", kind: "siliconflow" }), true)
  assert.equal(providersCompatibleWith("deepseek", { kind: "xai" }), true)
  assert.equal(providersCompatibleWith("deepseek", { kind: "custom" }), true)
  assert.equal(providersCompatibleWith("deepseek", { apiStyle: "anthropic", kind: "anthropic" }), false)
  assert.equal(providersCompatibleWith("deepseek", { apiStyle: "openai", kind: "google" }), false)
})

test("没 Key 的档案不进可选列表", () => {
  const rows = providersSelectableFor("claude", [
    { id: "a", apiStyle: "anthropic", kind: "anthropic", hasKey: true },
    { id: "b", apiStyle: "anthropic", kind: "anthropic", hasKey: false }
  ])
  assert.deepEqual(rows.map((item) => item.id), ["a"])
})

test("空态协议名给人看，不是内部 enum", () => {
  assert.equal(protocolNameForBind("claude"), "Anthropic")
  assert.equal(protocolNameForBind("codex"), "OpenAI")
  assert.equal(protocolNameForBind("deepseek"), "DeepSeek / OpenAI")
  assert.equal(protocolNameForBind("cursor"), "")
})

test("新建档案预填该 CLI 的协议，不丢去整页列表", () => {
  assert.deepEqual(createTargetForBind("claude"), { kind: "anthropic", apiStyle: "anthropic" })
  assert.deepEqual(createTargetForBind("codex"), { kind: "openai", apiStyle: "openai-responses" })
  assert.equal(createTargetForBind("cursor"), null)
})

test("下拉按协议分组，不按 CLI", () => {
  const groups = groupProvidersForBind([
    { id: "a", apiStyle: "anthropic", kind: "anthropic" },
    { id: "b", apiStyle: "openai", kind: "custom" },
    { id: "c", apiStyle: "openai-responses", kind: "openai" },
    { id: "d", kind: "google", apiStyle: "openai" }
  ])
  assert.deepEqual(
    groups.map((item) => [item.group, item.items.map((row) => row.id)]),
    [
      ["anthropic", ["a"]],
      ["openai", ["b", "c"]],
      ["google", ["d"]]
    ]
  )
})

test("两个 CLI 绑同一 providerId 则两枚引用", () => {
  const refs = agentRefsForProvider("prov_1", [
    { id: "claude", label: "Claude Code", providerId: "prov_1", useCustomProvider: true },
    { id: "codex", label: "Codex CLI", providerId: "prov_1", useCustomProvider: true },
    { id: "gemini", label: "Gemini CLI", providerId: "prov_1", useCustomProvider: false }
  ])
  assert.deepEqual(refs.map((item) => item.id), ["claude", "codex"])
})

test("绑了中转档案：只列 vault 两个模型，不混 CLI 官方表", () => {
  const catalog = [
    { id: "sonnet", label: "Sonnet 4.6" },
    { id: "opus", label: "Opus 4.6" }
  ]
  const vault = [
    { id: "deepseek-flash", label: "deepseek-flash" },
    { id: "deepseek-v4-pro", label: "deepseek-v4-pro" }
  ]
  assert.deepEqual(
    composeAgentModels({ catalog, bound: true, vaultModels: vault }).map((item) => item.id),
    ["deepseek-flash", "deepseek-v4-pro"]
  )
  assert.deepEqual(
    composeAgentModels({ catalog, bound: false, vaultModels: vault }).map((item) => item.id),
    ["sonnet", "opus"]
  )
})

test("tool.models 已混进官方表时，仍只信 vault 档案", () => {
  const mixed = [
    { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
    { id: "deepseek-flash", label: "deepseek-flash" }
  ]
  const ids = resolveBoundAgentModels(
    { useCustomProvider: true, providerId: "prv_1", models: mixed },
    [
      {
        id: "prv_1",
        models: [
          { id: "deepseek-flash", label: "deepseek-flash" },
          { id: "deepseek-v4-pro", label: "deepseek-v4-pro" }
        ]
      }
    ]
  ).map((item) => item.id)
  assert.deepEqual(ids, ["deepseek-flash", "deepseek-v4-pro"])
})

test("绑定后官方模型 id 不能当所选，回落到档案第一项", () => {
  const vault = [{ id: "deepseek-flash" }, { id: "deepseek-v4-pro" }]
  assert.equal(pickBoundModelId("claude-sonnet-4-6", vault), "deepseek-flash")
  assert.equal(pickBoundModelId("deepseek-v4-pro", vault), "deepseek-v4-pro")
})

test("也用于不含沙箱与 Enjoy 本地", () => {
  const profile = { apiStyle: "anthropic", kind: "anthropic" }
  const ids = alsoUseTargets("claude", profile, [
    { id: "opencode", status: "ready" },
    { id: "sandbox-harness", status: "ready" },
    { id: "enjoy-local", status: "ready" },
    { id: "cursor", status: "ready" },
    { id: "codex", status: "ready" }
  ]).map((item) => item.id)
  assert.deepEqual(ids, ["opencode"])
  assert.ok(!ids.includes("sandbox-harness"))
})
