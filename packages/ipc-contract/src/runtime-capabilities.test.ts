import assert from "node:assert/strict"
import { test } from "node:test"
import {
  capabilitiesFor,
  composerChromeFor,
  HIDDEN_RUNTIME_CAPABILITIES
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
  "deepseek",
  "omp"
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

  assert.equal(capabilitiesFor("claude").thinking, "model-id")
  assert.equal(capabilitiesFor("claude").fast, "none")
  assert.equal(capabilitiesFor("claude").quota, false)
  assert.equal(capabilitiesFor("claude").login, true)
  assert.equal(capabilitiesFor("claude").models, "inspect")
  assert.equal(capabilitiesFor("claude").providerBind, "anthropic")
  assert.equal(capabilitiesFor("claude").askUser, "hidden")

  assert.equal(capabilitiesFor("cursor").fast, "model-id")
  assert.equal(capabilitiesFor("cursor").thinking, "model-id")
  assert.equal(capabilitiesFor("cursor").quota, true)
  assert.equal(capabilitiesFor("cursor").providerBind, "none")

  assert.equal(capabilitiesFor("grok").fast, "none")
  assert.equal(capabilitiesFor("grok").thinking, "none")
  assert.equal(capabilitiesFor("grok").quota, true)

  assert.equal(capabilitiesFor("codex").quota, false)
  assert.equal(capabilitiesFor("codex").models, "inspect")
  assert.equal(capabilitiesFor("codex").providerBind, "openai")

  assert.equal(capabilitiesFor("antigravity").thinking, "model-id")
  assert.equal(capabilitiesFor("antigravity").quota, true)
})

test("已接线六家：HMAC 审批、可纠偏、无 Resume/委派/斜杠目录", () => {
  for (const id of WIRED) {
    const cap = capabilitiesFor(id)
    assert.equal(cap.spawn, true)
    assert.equal(cap.permissionUi, "enjoy-hmac")
    assert.equal(cap.steer, true)
    assert.equal(cap.resumeFork, false)
    assert.equal(cap.delegate, false)
    assert.notEqual(cap.slash, "acp-list")
  }
})

test("未知 id 回落隐藏表；七家新 ACP 可 spawn", () => {
  for (const id of HIDDEN_IDS) {
    assert.deepEqual(capabilitiesFor(id), HIDDEN_RUNTIME_CAPABILITIES)
  }
  assert.deepEqual(capabilitiesFor(undefined), HIDDEN_RUNTIME_CAPABILITIES)
  assert.equal(capabilitiesFor("gemini").spawn, true)
  assert.equal(capabilitiesFor("opencode").models, "inspect")
  assert.equal(capabilitiesFor("pi").spawn, true)
  assert.equal(capabilitiesFor("hermes").models, "none")
  assert.equal(capabilitiesFor("amp").models, "none")
  assert.equal(capabilitiesFor("deepseek").providerBind, "deepseek")
  assert.equal(capabilitiesFor("omp").spawn, true)
  assert.equal(capabilitiesFor("omp").quota, false)
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
    voice: false
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

test("ACP 宿主都不露 Fast / 思考 / 模式 / 语音", () => {
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
    "deepseek",
    "omp"
  ] as const) {
    const chrome = composerChromeFor(id)
    assert.equal(chrome.fast, false, id)
    assert.equal(chrome.thinking, false, id)
    assert.equal(chrome.executionModes, false, id)
    assert.equal(chrome.voice, false, id)
  }
})
