/**
 * E2E 路线夹具：没开 stub / 打包态不得冒充 ready。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
  assert.equal(snap?.credentialCheck?.state, "ok")
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

test("ENJOY_E2E_CREDENTIAL 三态挂到 key 夹具；invalid 不 ready", () => {
  const isolated = { ENJOY_E2E_STUB: "1", ENJOY_E2E_USERDATA: "/tmp/e2e-ud", ENJOY_E2E_CHAT_READY: "key" }
  const ok = e2eChatReadiness({
    ...isolated,
    ENJOY_E2E_CREDENTIAL: "ok"
  })
  assert.equal(ok?.ready, true)
  assert.equal(ok?.credentialCheck?.state, "ok")
  const invalid = e2eChatReadiness({
    ...isolated,
    ENJOY_E2E_CREDENTIAL: "invalid"
  })
  assert.equal(invalid?.ready, false)
  assert.equal(invalid?.credentialCheck?.state, "invalid")
  assert.equal(invalid?.credentialCheck?.code, "auth_rejected")
  const unverified = e2eChatReadiness({
    ...isolated,
    ENJOY_E2E_CREDENTIAL: "unverified"
  })
  assert.equal(unverified?.ready, true)
  assert.equal(unverified?.credentialCheck?.state, "unverified")
  assert.equal(unverified?.credentialCheck?.code, "unknown")
  assert.equal(unverified?.defaultRoute?.profileId, "e2e")
  const timed = e2eChatReadiness({
    ...isolated,
    ENJOY_E2E_CREDENTIAL: "unverified:timeout"
  })
  assert.equal(timed?.ready, true)
  assert.equal(timed?.credentialCheck?.state, "unverified")
  assert.equal(timed?.credentialCheck?.code, "timeout")
  const forbidden = e2eChatReadiness({
    ...isolated,
    ENJOY_E2E_CREDENTIAL: "unverified:forbidden"
  })
  assert.equal(forbidden?.ready, true)
  assert.equal(forbidden?.credentialCheck?.state, "unverified")
  assert.equal(forbidden?.credentialCheck?.code, "forbidden")
  const billing = e2eChatReadiness({
    ...isolated,
    ENJOY_E2E_CREDENTIAL: "unverified:billing"
  })
  assert.equal(billing?.ready, true)
  assert.equal(billing?.credentialCheck?.state, "unverified")
  assert.equal(billing?.credentialCheck?.code, "billing")
})

test("stub + none 不冻结空快照，后续从 vault 组装", () => {
  assert.equal(e2eChatReadiness({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "none" }), null)
  assert.equal(
    chatRouteAllowsSend({
      runtimeId: "enjoy-local",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    false
  )
})

test("CHAT_READY 未设时不注入 live ollama，走现场 ping", () => {
  const src = readFileSync(new URL("./chat-readiness.ts", import.meta.url), "utf8")
  assert.doesNotMatch(src, /isE2eStub\(\) \? Promise\.resolve\(\["ollama"\]/)
  assert.match(src, /pingLocalModelServices\(\)/)
})

test("stub + unverified 露出远端本机模型；有密钥则 ready，闸放行", () => {
  const snap = e2eChatReadiness({ ENJOY_E2E_STUB: "1", ENJOY_E2E_CHAT_READY: "unverified" })
  assert.equal(snap?.ready, true)
  assert.deepEqual(snap?.localModels, [{ kind: "local_model", service: "ollama", verified: false }])
  assert.equal(snap?.hasEnjoySecret, true)
  assert.equal(snap?.credentialCheck?.state, "unverified")
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
