/**
 * inspect 合并：账号 / 模型 / 供应商；缺 providers 时保留原表。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { AgentToolPublic, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import {
  applyInspect,
  orderInspectTargets,
  settledInspectResults,
  shouldInspect
} from "./merge-agent-tool-inspect.ts"

function tool(partial: Partial<AgentToolPublic> & Pick<AgentToolPublic, "id">): AgentToolPublic {
  return {
    label: partial.id,
    transport: "acp-host",
    binaries: [],
    acpArgs: [],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false,
    enabled: true,
    detectedPath: "/bin/agent",
    version: null,
    status: "ready",
    models: [{ id: "composer-2.5", label: "Composer 2.5" }],
    selectedModel: "composer-2.5",
    installKind: "copy",
    installCommand: "",
    docsUrl: "",
    useCustomProvider: false,
    supportedApiStyles: [],
    ...partial
  }
}

test("只给已就绪且 login/quota/inspect 模型的 CLI 做 inspect", () => {
  assert.equal(shouldInspect(tool({ id: "cursor" })), true)
  assert.equal(shouldInspect(tool({ id: "grok" })), true)
  assert.equal(shouldInspect(tool({ id: "claude" })), true)
  assert.equal(shouldInspect(tool({ id: "cursor", status: "missing" })), false)
  assert.equal(shouldInspect(tool({ id: "enjoy-local", status: "ready" })), false)
  assert.equal(shouldInspect(tool({ id: "omp", skillOnly: true, status: "skillOnly" })), false)
  assert.equal(shouldInspect(tool({ id: "opencode", status: "ready" })), true)
  assert.equal(shouldInspect(tool({ id: "omp", status: "ready" })), true)
  assert.equal(shouldInspect(tool({ id: "amp", status: "ready" })), true)
  assert.equal(shouldInspect(tool({ id: "deepseek", status: "ready" })), false)
  assert.equal(shouldInspect(tool({ id: "deepseek", status: "ready", requiredVersion: "0.1.0" })), true)
})

test("inspect 合并账号与全量模型，保留已选模型", () => {
  const inspect: InspectAgentToolResult = {
    id: "cursor",
    authAccount: { loggedIn: true, email: "dev@example.com", tier: "Ultra" },
    models: [
      { id: "auto", label: "Auto" },
      { id: "composer-2.5", label: "Composer 2.5" },
      { id: "cursor-grok-4.6-xhigh-fast", label: "Grok Fast" }
    ]
  }
  const merged = applyInspect([tool({ id: "cursor" })], [inspect])
  assert.equal(merged[0]?.authAccount?.tier, "Ultra")
  assert.equal(merged[0]?.models.length, 3)
  assert.equal(merged[0]?.selectedModel, "composer-2.5")
})

test("inspect 把 cliVersion 并进列表 version", () => {
  const merged = applyInspect(
    [tool({ id: "cursor", version: null })],
    [{ id: "cursor", authAccount: { loggedIn: true, cliVersion: "1.2" }, models: [] }]
  )
  assert.equal(merged[0]?.version, "1.2")
})

test("OMP inspect 合并可登录供应商", () => {
  const inspect: InspectAgentToolResult = {
    id: "omp",
    models: [{ id: "google-antigravity/gemini-3-flash", label: "Flash" }],
    providers: [
      { id: "google-antigravity", label: "Antigravity", loggedIn: true },
      { id: "anthropic", label: "Anthropic", loggedIn: false }
    ]
  }
  const merged = applyInspect([tool({ id: "omp", models: [] })], [inspect])
  assert.equal(merged[0]?.providers?.length, 2)
  assert.equal(merged[0]?.providers?.[1]?.loggedIn, false)
})

test("绑定 Enjoy 档案时 inspect 不得改掉所选模型，也不得混进 CLI 目录", () => {
  const merged = applyInspect(
    [
      tool({
        id: "claude",
        useCustomProvider: true,
        providerId: "prv_1",
        selectedModel: "deepseek-flash",
        models: [
          { id: "deepseek-flash", label: "deepseek-flash" },
          { id: "deepseek-v4-pro", label: "deepseek-v4-pro" }
        ]
      })
    ],
    [
      {
        id: "claude",
        models: [
          { id: "sonnet", label: "Sonnet 4.6" },
          { id: "opus", label: "Opus 4.6" }
        ]
      }
    ]
  )
  assert.equal(merged[0]?.selectedModel, "deepseek-flash")
  assert.deepEqual(
    merged[0]?.models.map((item) => item.id),
    ["deepseek-flash", "deepseek-v4-pro"]
  )
})

test("list 已把官方表拼进 models 时，Composer 仍只显示 vault 两个模型", () => {
  const merged = applyInspect(
    [
      tool({
        id: "claude",
        useCustomProvider: true,
        providerId: "prv_1",
        selectedModel: "deepseek-flash",
        models: [
          { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
          { id: "claude-opus-4-6", label: "Opus 4.6" },
          { id: "claude-sonnet-5", label: "Sonnet 5" },
          { id: "claude-opus-5", label: "Opus 5" },
          { id: "claude-haiku-4-5", label: "Haiku 4.5" },
          { id: "deepseek-flash", label: "deepseek-flash" },
          { id: "deepseek-v4-pro", label: "deepseek-v4-pro" }
        ]
      })
    ],
    undefined,
    [
      {
        id: "prv_1",
        models: [
          { id: "deepseek-flash", label: "deepseek-flash" },
          { id: "deepseek-v4-pro", label: "deepseek-v4-pro" }
        ]
      }
    ]
  )
  assert.deepEqual(
    merged[0]?.models.map((item) => item.id),
    ["deepseek-flash", "deepseek-v4-pro"]
  )
  assert.equal(merged[0]?.selectedModel, "deepseek-flash")
})

test("inspect 带回空 providers 且本地已有表时保留原表", () => {
  const merged = applyInspect(
    [
      tool({
        id: "omp",
        models: [],
        providers: [{ id: "anthropic", label: "Anthropic", loggedIn: false }]
      })
    ],
    [{ id: "omp", models: [], providers: [] }]
  )
  assert.equal(merged[0]?.providers?.length, 1)
  assert.equal(merged[0]?.providers?.[0]?.id, "anthropic")
})

test("inspect 没带回 authAccount 时保留旧账号，不要当成从未检测", () => {
  const merged = applyInspect(
    [tool({ id: "claude", authAccount: { loggedIn: true, email: "a@b.c" } })],
    [{ id: "claude", models: [] }]
  )
  assert.equal(merged[0]?.authAccount?.loggedIn, true)
  assert.equal(merged[0]?.authAccount?.email, "a@b.c")
})

test("allSettled 只收成功项；当前引擎排前面", () => {
  const settled = settledInspectResults([
    { status: "rejected", reason: new Error("hermes") },
    { status: "fulfilled", value: { id: "claude", models: [] } }
  ])
  assert.deepEqual(
    settled.map((item) => item.id),
    ["claude"]
  )
  assert.deepEqual(
    orderInspectTargets([{ id: "hermes" }, { id: "claude" }], "claude").map((item) => item.id),
    ["claude", "hermes"]
  )
})

test("inspect 没带回 providers 时保留原表，不要写成空数组", () => {
  const merged = applyInspect(
    [
      tool({
        id: "omp",
        models: [],
        providers: [{ id: "anthropic", label: "Anthropic", loggedIn: false }]
      })
    ],
    [{ id: "omp", models: [] }]
  )
  assert.equal(merged[0]?.providers?.length, 1)
  assert.equal(merged[0]?.providers?.[0]?.id, "anthropic")
})
