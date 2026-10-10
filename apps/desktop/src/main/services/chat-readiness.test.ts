/**
 * 可对话路线组装：每条单独、全无、只有本地引擎都不 ready。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { NO_CHAT_ROUTE, missingChatRouteCode } from "@enjoy-agents/ipc-contract/chat-readiness"
import { assembleChatReadiness, pingLocalModelServices } from "./chat-readiness-assemble.ts"

test("只有已登录外置引擎时 ready", () => {
  const snap = assembleChatReadiness(
    [{ id: "claude", status: "ready", name: "Claude Code" }],
    [],
    [],
    new Set(["claude"])
  )
  assert.equal(snap.ready, true)
  assert.equal(snap.engines[0]?.runtimeId, "claude")
  assert.equal(missingChatRouteCode(snap.ready), null)
})

test("只有探测到的本机模型时 ready", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready", name: "Enjoy Local" }],
    [],
    ["ollama"]
  )
  assert.equal(snap.ready, true)
  assert.deepEqual(snap.localModels, [{ kind: "local_model", service: "ollama" }])
})

test("只有已启用的本机档案时 ready（e2e stub）", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready" }],
    [{ id: "prv_ollama", kind: "ollama", enabled: true, hasKey: false, requiresKey: false }],
    []
  )
  assert.equal(snap.ready, true)
  assert.deepEqual(snap.localModels, [{ kind: "local_model", service: "ollama" }])
})

test("只有已存 API 密钥时 ready，载荷不含密钥", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready" }],
    [{ id: "prv_1", kind: "openai", enabled: true, hasKey: true, requiresKey: true }],
    []
  )
  assert.equal(snap.ready, true)
  assert.deepEqual(snap.apiKeys, [{ kind: "api_key", providerId: "prv_1", presetId: "openai" }])
  assert.equal(JSON.stringify(snap).includes("sk-"), false)
})

test("一条路线都没有时不 ready，稳定码 no_chat_route", () => {
  const snap = assembleChatReadiness([], [], [])
  assert.equal(snap.ready, false)
  assert.equal(missingChatRouteCode(snap.ready), NO_CHAT_ROUTE)
})

test("只有本地引擎、没连模型时不 ready；引擎数仍算 1", () => {
  const snap = assembleChatReadiness([{ id: "enjoy-local", status: "ready", name: "Enjoy Local" }], [], [])
  assert.equal(snap.ready, false)
  assert.equal(snap.engineCount, 1)
  assert.equal(snap.engines.length, 0)
  assert.equal(missingChatRouteCode(snap.ready), NO_CHAT_ROUTE)
})

test("本机探测失败或超时不算路线", async () => {
  const live = await pingLocalModelServices(async () => false)
  assert.deepEqual(live, [])
})
