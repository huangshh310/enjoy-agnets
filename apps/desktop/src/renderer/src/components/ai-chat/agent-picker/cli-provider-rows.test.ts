/**
 * OMP 左栏：inspect 全表 ∪ 模型 selector；inspect 未回时算 catalog pending。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import {
  buildCliProviderRows,
  cliCatalogPending,
  groupCliProviderNav,
  initialCliNavKey,
  modelsForCliProvider,
  shouldShowCliProviderNav
} from "./cli-provider-rows.ts"

function agent(partial: Partial<AgentToolPublic>): AgentToolPublic {
  return {
    id: "omp",
    label: "Oh My Pi",
    transport: "acp-host",
    binaries: ["omp"],
    acpArgs: ["acp"],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false,
    enabled: true,
    detectedPath: "/bin/omp",
    version: null,
    status: "ready",
    models: [],
    providers: [],
    installKind: "copy",
    installCommand: "",
    docsUrl: "",
    useCustomProvider: false,
    supportedApiStyles: [],
    ...partial
  }
}

test("OMP 即使只有一家已登录模型也要左栏", () => {
  const one = agent({
    models: [{ id: "google-antigravity/gemini-3-flash", label: "Gemini 3 Flash" }],
    providers: [
      { id: "google-antigravity", label: "Antigravity", loggedIn: true },
      { id: "anthropic", label: "Anthropic", loggedIn: false }
    ]
  })
  assert.equal(shouldShowCliProviderNav(one), true)
  const rows = buildCliProviderRows(one)
  assert.equal(rows.length, 2)
  assert.equal(rows[0]?.count, 1)
  assert.equal(rows[1]?.loggedIn, false)
})

test("默认停在已选模型的供应商", () => {
  const rows = [
    { key: "google-antigravity", label: "Antigravity", loggedIn: true, count: 2 },
    { key: "anthropic", label: "Anthropic", loggedIn: false, count: 0 }
  ]
  assert.equal(
    initialCliNavKey(rows, "anthropic/claude-opus-4-5"),
    "anthropic"
  )
})

test("自定义供应商带上 origin，左栏才能去掉登录", () => {
  const rows = buildCliProviderRows(
    agent({
      models: [{ id: "my-openai-compatible/fast-chat", label: "Fast Chat" }],
      providers: [
        {
          id: "my-openai-compatible",
          label: "My Openai Compatible",
          loggedIn: true,
          origin: "custom"
        }
      ]
    })
  )
  assert.equal(rows[0]?.origin, "custom")
  assert.equal(rows[0]?.loggedIn, true)
})

test("inspect 未回时 OMP 算 catalog pending", () => {
  const empty = agent({ providers: undefined })
  assert.equal(cliCatalogPending(empty, true), true)
  assert.equal(cliCatalogPending(empty, false), true)
  assert.equal(
    cliCatalogPending(
      agent({
        providers: [{ id: "anthropic", label: "Anthropic", loggedIn: false }]
      }),
      true
    ),
    false
  )
})

test("左栏分组：已登录 / 自定义 / 未登录", () => {
  const groups = groupCliProviderNav([
    { key: "a", label: "A", loggedIn: true, count: 1 },
    { key: "b", label: "B", loggedIn: false, count: 0, origin: "custom" },
    { key: "c", label: "C", loggedIn: false, count: 0, origin: "catalog" }
  ])
  assert.deepEqual(
    groups.signed.map((item) => item.key),
    ["a"]
  )
  assert.deepEqual(
    groups.customPending.map((item) => item.key),
    ["b"]
  )
  assert.deepEqual(
    groups.pending.map((item) => item.key),
    ["c"]
  )
})

test("按供应商过滤模型", () => {
  const models = [
    { id: "google-antigravity/gemini-3-flash", label: "Flash" },
    { id: "anthropic/claude-opus-4-5", label: "Opus" }
  ]
  assert.deepEqual(
    modelsForCliProvider(models, "anthropic").map((item) => item.id),
    ["anthropic/claude-opus-4-5"]
  )
})
