/**
 * E2E 路线夹具：没开 stub / 打包态不得冒充 ready。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { chatRouteAllowsSend, isVerifiedLocalModel } from "@enjoy-agents/ipc-contract/chat-readiness"
import { e2eChatReadiness } from "./e2e-chat-readiness.ts"

test("没开 stub 或打包态一律不覆盖", () => {
  assert.equal(e2eChatReadiness({}), null)
  assert.equal(e2eChatReadiness({ ENJOY_E2E_CHAT_READY: "key" }), null)
  assert.equal(e2eChatReadiness({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "key" }, true), null)
})

test("stub + key 带可发默认路线，不含秘密", () => {
  const snap = e2eChatReadiness({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "key" })
  assert.equal(snap?.ready, true)
  assert.equal(snap?.apiKeys[0]?.presetId, "openai")
  assert.equal(snap?.defaultRoute?.runtimeId, "enjoy-local")
  assert.equal(snap?.defaultRoute?.modelId, "stub-e2e")
  assert.equal(snap?.defaultRoute?.profileId, "e2e")
  assert.equal(
    chatRouteAllowsSend({
      runtimeId: snap?.defaultRoute?.runtimeId ?? "",
      hasEnjoySecret: (snap?.apiKeys.length ?? 0) > 0,
      verifiedLocal: snap?.localModels.some(isVerifiedLocalModel) ?? false
    }),
    true
  )
  assert.equal(JSON.stringify(snap).includes("sk-"), false)
})

test("stub + none 引擎数不能冒充可以开始", () => {
  const snap = e2eChatReadiness({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "none" })
  assert.equal(snap?.ready, false)
  assert.equal(snap?.engineCount, 1)
  assert.equal(
    chatRouteAllowsSend({
      runtimeId: snap?.defaultRoute?.runtimeId ?? "enjoy-local",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    false
  )
})

test("stub + unverified 露出远端本机模型但不 ready", () => {
  const snap = e2eChatReadiness({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "unverified" })
  assert.equal(snap?.ready, false)
  assert.deepEqual(snap?.localModels, [{ kind: "local_model", service: "ollama", verified: false }])
})

test("stub + engine 默认路线是已登录 CLI，闸放行", () => {
  const snap = e2eChatReadiness({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "engine" })
  assert.equal(snap?.ready, true)
  assert.equal(snap?.defaultRoute?.runtimeId, "claude")
  assert.equal(
    chatRouteAllowsSend({
      runtimeId: snap?.defaultRoute?.runtimeId ?? "",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    true
  )
})
