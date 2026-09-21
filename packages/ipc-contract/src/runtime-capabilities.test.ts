import assert from "node:assert/strict"
import { test } from "node:test"
import {
  capabilitiesFor,
  composerChromeFor,
  composerThinkingChrome,
  canHostInterceptExplore,
  HIDDEN_RUNTIME_CAPABILITIES,
  MATRIX_RUNTIME_IDS,
  runtimePathKind,
  SANDBOX_HARNESS_ID,
  supportsConversationRollback
} from "./runtime-capabilities.ts"

const WIRED = [
  "enjoy-local",
  "claude",
  "cursor",
  "grok",
  "codex",
  "antigravity",
  "gemini",
  "opencode",
  "pi",
  "hermes",
  "amp",
  "droid",
  "devin",
  "deepseek",
  "omp",
  "qwen",
  "kimi",
  "codebuddy",
  "glm",
  "minimax",
  "qoder"
] as const
const HIDDEN_IDS = ["not-a-tool"] as const

test("六家快照：spawn / thinking / fast / quota / providerBind", () => {
  assert.equal(capabilitiesFor("enjoy-local").spawn, true)
  assert.equal(capabilitiesFor("enjoy-local").thinking, "effort")
  assert.equal(capabilitiesFor("enjoy-local").fast, "local")
  assert.equal(capabilitiesFor("enjoy-local").quota, false)
  assert.equal(capabilitiesFor("enjoy-local").executionModes, "enjoy-local")
  assert.equal(capabilitiesFor("enjoy-local").realtime, true)
  assert.equal(capabilitiesFor("enjoy-local").providerBind, "none")
  assert.equal(supportsConversationRollback("enjoy-local"), true)
  assert.equal(supportsConversationRollback("cursor"), false)
  assert.equal(supportsConversationRollback("claude"), false)

  assert.equal(capabilitiesFor("claude").thinking, "advertised")
  assert.equal(capabilitiesFor("claude").fast, "none")
  assert.equal(capabilitiesFor("claude").quota, true)
  assert.equal(capabilitiesFor("claude").login, true)
  assert.equal(capabilitiesFor("claude").models, "inspect")
  assert.equal(capabilitiesFor("claude").providerBind, "anthropic")
  assert.equal(capabilitiesFor("claude").askUser, "hidden")

  assert.equal(capabilitiesFor("cursor").fast, "model-id")
  assert.equal(capabilitiesFor("cursor").thinking, "model-id")
  assert.equal(capabilitiesFor("cursor").quota, true)
  assert.equal(capabilitiesFor("cursor").providerBind, "none")

  assert.equal(capabilitiesFor("grok").fast, "none")
  assert.equal(capabilitiesFor("grok").thinking, "advertised")
  assert.equal(capabilitiesFor("grok").quota, true)

  assert.equal(capabilitiesFor("codex").quota, true)
  assert.equal(capabilitiesFor("codex").models, "inspect")
  assert.equal(capabilitiesFor("codex").thinking, "advertised")
  assert.equal(capabilitiesFor("codex").providerBind, "openai")

  assert.equal(capabilitiesFor("antigravity").thinking, "model-id")
  assert.equal(capabilitiesFor("antigravity").quota, true)
})

test("已接线引擎：HMAC 审批、可纠偏、无 Resume/斜杠目录；仅 Enjoy Local 委派", () => {
  for (const id of WIRED) {
    const cap = capabilitiesFor(id)
    assert.equal(cap.spawn, true)
    assert.equal(cap.permissionUi, "enjoy-hmac")
    assert.equal(cap.steer, true)
    assert.equal(cap.resumeFork, false)
    assert.equal(cap.delegate, id === "enjoy-local")
    assert.notEqual(cap.slash, "acp-list")
  }
})

test("未知 id 回落隐藏表；七家新 ACP 可 spawn", () => {
  for (const id of HIDDEN_IDS) {
    assert.deepEqual(capabilitiesFor(id), HIDDEN_RUNTIME_CAPABILITIES)
  }
  assert.deepEqual(capabilitiesFor(undefined), HIDDEN_RUNTIME_CAPABILITIES)
  assert.equal(capabilitiesFor("gemini").spawn, true)
  assert.equal(capabilitiesFor("gemini").providerBind, "google")
  assert.equal(capabilitiesFor("opencode").models, "inspect")
  assert.equal(capabilitiesFor("opencode").providerBind, "opencode")
  assert.equal(capabilitiesFor("pi").spawn, true)
  assert.equal(capabilitiesFor("hermes").models, "none")
  assert.equal(capabilitiesFor("amp").models, "none")
  assert.equal(capabilitiesFor("deepseek").providerBind, "deepseek")
  assert.equal(capabilitiesFor("omp").spawn, true)
  assert.equal(capabilitiesFor("omp").quota, false)
  assert.equal(capabilitiesFor("qwen").spawn, true)
  assert.equal(capabilitiesFor("kimi").thinking, "advertised")
  assert.equal(capabilitiesFor("codebuddy").login, true)
  assert.equal(capabilitiesFor("glm").login, false)
  assert.equal(capabilitiesFor("minimax").spawn, true)
  assert.equal(capabilitiesFor("qoder").spawn, true)
  assert.equal(capabilitiesFor("droid").spawn, true)
  assert.equal(capabilitiesFor("devin").spawn, true)
  assert.equal(capabilitiesFor("droid").providerBind, "none")
  assert.equal(capabilitiesFor("devin").login, true)
})

test("宿主扩展：Local 注入工具，ACP 透传，Pi 不传 MCP", () => {
  assert.equal(capabilitiesFor("enjoy-local").hostMcp, "local-tools")
  assert.equal(capabilitiesFor("enjoy-local").hostSkills, "catalog-tool")
  assert.equal(capabilitiesFor("cursor").hostMcp, "acp-passthrough")
  assert.equal(capabilitiesFor("cursor").hostSkills, "catalog-prompt")
  assert.equal(capabilitiesFor("deepseek").hostMcp, "acp-passthrough")
  assert.equal(capabilitiesFor("pi").hostMcp, "none")
  assert.equal(capabilitiesFor("pi").hostSkills, "catalog-prompt")
  assert.equal(capabilitiesFor("sandbox-harness").hostMcp, "none")
})

test("composerChromeFor：Cursor 只剩 + / 审批 / 胶囊 / 发送", () => {
  const chrome = composerChromeFor("cursor")
  assert.deepEqual(chrome, {
    attach: true,
    permission: true,
    agentPicker: true,
    send: true,
    executionModes: false,
    fast: false,
    thinking: false,
    voice: false,
    pathKind: "acp-host",
    showOnEngineRail: true,
    quota: true
  })
})

test("composerChromeFor：Enjoy Local 露出模式 / Fast / 思考 / 语音位", () => {
  const chrome = composerChromeFor("enjoy-local")
  assert.equal(chrome.executionModes, true)
  assert.equal(chrome.fast, true)
  assert.equal(chrome.thinking, true)
  assert.equal(chrome.voice, true)
  assert.equal(chrome.permission, true)
})

test("思考铬：effort 五档，model-id 跟模型，advertised 广告档，none 隐藏", () => {
  assert.equal(composerThinkingChrome("enjoy-local"), "effort")
  assert.equal(composerThinkingChrome("claude"), "advertised")
  assert.equal(composerThinkingChrome("cursor"), "follow-model")
  assert.equal(composerThinkingChrome("gemini"), "follow-model")
  assert.equal(composerThinkingChrome("antigravity"), "follow-model")
  assert.equal(composerThinkingChrome("grok"), "advertised")
  assert.equal(composerThinkingChrome("codex"), "advertised")
  assert.equal(composerThinkingChrome("qwen"), "advertised")
  assert.equal(canHostInterceptExplore("cursor"), true)
  assert.equal(canHostInterceptExplore("enjoy-local"), true)
  assert.equal(canHostInterceptExplore("not-a-tool"), false)
})

test("ACP 宿主都不露 Fast / 五档思考 / 语音；探索分段由 UI 常驻", () => {
  for (const id of [
    "claude",
    "cursor",
    "grok",
    "codex",
    "antigravity",
    "gemini",
    "opencode",
    "pi",
    "hermes",
    "amp",
    "droid",
    "devin",
    "deepseek",
    "omp",
    "qwen",
    "kimi",
    "codebuddy",
    "glm",
    "minimax",
    "qoder"
  ] as const) {
    const chrome = composerChromeFor(id)
    assert.equal(chrome.fast, false, id)
    assert.equal(chrome.thinking, false, id)
    assert.equal(chrome.executionModes, false, id)
    assert.equal(chrome.voice, false, id)
    assert.equal(chrome.pathKind, "acp-host", id)
    assert.equal(chrome.showOnEngineRail, true, id)
  }
})

test("自定义 ACP 走 ACP 本机 CLI 路径，可上导轨、无额度", () => {
  const chrome = composerChromeFor("custom:lab")
  assert.equal(chrome.pathKind, "acp-host")
  assert.equal(chrome.showOnEngineRail, true)
  assert.equal(chrome.quota, false)
  assert.equal(capabilitiesFor("custom:lab").permissionUi, "enjoy-hmac")
})

test("三路路径：Enjoy 本地 / ACP / 沙箱；沙箱不上导轨", () => {
  assert.equal(runtimePathKind("enjoy-local"), "enjoy-local")
  assert.equal(runtimePathKind("cursor"), "acp-host")
  assert.equal(runtimePathKind(SANDBOX_HARNESS_ID), "sandbox-harness")
  const sandbox = composerChromeFor(SANDBOX_HARNESS_ID)
  assert.equal(sandbox.pathKind, "sandbox-harness")
  assert.equal(sandbox.showOnEngineRail, false)
  assert.equal(sandbox.quota, false)
  assert.equal(capabilitiesFor(SANDBOX_HARNESS_ID).login, false)
  assert.ok(MATRIX_RUNTIME_IDS.includes(SANDBOX_HARNESS_ID))
  assert.equal(composerChromeFor("enjoy-local").pathKind, "enjoy-local")
  assert.equal(composerChromeFor("enjoy-local").showOnEngineRail, true)
  assert.equal(composerChromeFor("enjoy-local").quota, false)
})
