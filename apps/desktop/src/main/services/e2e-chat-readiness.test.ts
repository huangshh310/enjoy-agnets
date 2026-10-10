/**
 * E2E 路线夹具：没开 stub / 打包态不得冒充 ready。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { chatRouteAllowsSend, isVerifiedLocalModel } from "@enjoy-agents/ipc-contract/chat-readiness"
import {
  applyE2eStubEngine,
  e2eChatReadiness,
  e2eChatReadySeedAllowed,
  e2eStubEngineInspect
} from "./e2e-chat-readiness.ts"

test("没开 stub 或打包态一律不覆盖", () => {
  assert.equal(e2eChatReadiness({}), null)
  assert.equal(e2eChatReadiness({ ENJOY_E2E_CHAT_READY: "key" }), null)
  assert.equal(e2eChatReadiness({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "key" }, true), null)
})

test("写盘夹具必须隔离 userData", () => {
  assert.equal(
    e2eChatReadySeedAllowed({
      env: { ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "key" },
      packaged: false
    }),
    false
  )
  assert.equal(
    e2eChatReadySeedAllowed({
      env: { ENJOY_E2E_STUB: "1", ENJOY_E2E_USERDATA: "/tmp/e2e-ud", ENJOY_E2E_CHAT_READY: "key" },
      packaged: false,
      userData: "/tmp/e2e-ud"
    }),
    true
  )
  assert.equal(
    e2eChatReadySeedAllowed({
      env: { ENJOY_E2E_STUB: "1", ENJOY_E2E_USERDATA: "/tmp/e2e-ud", ENJOY_E2E_CHAT_READY: "key" },
      packaged: false,
      userData: "/tmp/other"
    }),
    false
  )
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
      hasEnjoySecret: snap?.hasEnjoySecret ?? false,
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

test("stub + unverified 露出远端本机模型；不 ready，闸仍放行", () => {
  const snap = e2eChatReadiness({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "unverified" })
  assert.equal(snap?.ready, false)
  assert.deepEqual(snap?.localModels, [{ kind: "local_model", service: "ollama", verified: false }])
  assert.equal(snap?.hasEnjoySecret, true)
  assert.equal(
    chatRouteAllowsSend({
      runtimeId: "enjoy-local",
      hasEnjoySecret: true,
      verifiedLocal: false
    }),
    true
  )
})

test("stub + engine 列表行标成已登录就绪", () => {
  const overlaid = applyE2eStubEngine(
    [
      {
        id: "claude",
        label: "Claude Code",
        transport: "acp-host",
        binaries: ["claude"],
        acpArgs: ["acp"],
        needsLoginHint: "",
        available: true,
        comingSoon: false,
        skillOnly: false,
        enabled: true,
        detectedPath: null,
        version: null,
        status: "missing",
        models: [],
        installKind: "npm",
        installCommand: "",
        docsUrl: "",
        useCustomProvider: false,
        supportedApiStyles: []
      }
    ],
    { ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "engine" }
  )
  assert.equal(overlaid[0]?.status, "ready")
  assert.equal(overlaid[0]?.authAccount?.loggedIn, true)
})

test("打包态不覆盖引擎列表和 inspect", () => {
  const tools = [
    {
      id: "claude",
      label: "Claude Code",
      transport: "acp-host" as const,
      binaries: ["claude"],
      acpArgs: ["acp"],
      needsLoginHint: "",
      available: true,
      comingSoon: false,
      skillOnly: false,
      enabled: true,
      detectedPath: null,
      version: null,
      status: "missing" as const,
      models: [],
      installKind: "npm" as const,
      installCommand: "",
      docsUrl: "",
      useCustomProvider: false,
      supportedApiStyles: []
    }
  ]
  const env = { ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "engine" }
  assert.equal(applyE2eStubEngine(tools, env, true)[0]?.status, "missing")
  assert.equal(e2eStubEngineInspect("claude", env, true), null)
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
