/**
 * 可对话路线组装：每条单独、全无、只有本地引擎都不 ready。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  NO_CHAT_ROUTE,
  chatRouteAllowsSend,
  isVerifiedLocalModel,
  missingChatRouteCode
} from "@enjoy-agents/ipc-contract/chat-readiness"
import { assembleChatReadiness, pingLocalModelServices } from "./chat-readiness-assemble.ts"
import { selectedRouteGateCode } from "./selected-chat-route.ts"

test("只有已登录外置引擎时 ready，默认路线是该引擎", () => {
  const snap = assembleChatReadiness(
    [{ id: "claude", status: "ready", name: "Claude Code" }],
    [],
    [],
    new Set(["claude"])
  )
  assert.equal(snap.ready, true)
  assert.equal(snap.engines[0]?.runtimeId, "claude")
  assert.equal(snap.defaultRoute?.runtimeId, "claude")
  assert.equal(missingChatRouteCode(snap.ready), null)
})

test("只有探测到的本机模型时 ready", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready", name: "Enjoy Local" }],
    [],
    ["ollama"]
  )
  assert.equal(snap.ready, true)
  assert.deepEqual(snap.localModels, [{ kind: "local_model", service: "ollama", verified: true }])
})

test("已启用无密钥档案即使没 ping 也 ready，与闸一致", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready" }],
    [{ id: "prv_ollama", kind: "ollama", enabled: true, hasKey: false, requiresKey: false }],
    []
  )
  assert.equal(snap.ready, true)
  assert.equal(snap.hasEnjoySecret, true)
  assert.deepEqual(snap.localModels, [])
})

test("远端 Ollama 不 ping，verified:false；hasSecret 为真则 ready，闸放行", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready" }],
    [
      {
        id: "prv_remote",
        kind: "ollama",
        enabled: true,
        hasKey: false,
        requiresKey: false,
        baseURL: "http://10.0.0.8:11434"
      }
    ],
    []
  )
  assert.equal(snap.ready, true)
  assert.equal(snap.hasEnjoySecret, true)
  assert.deepEqual(snap.localModels, [{ kind: "local_model", service: "ollama", verified: false }])
  assert.equal(
    selectedRouteGateCode({
      skip: false,
      runtimeId: "enjoy-local",
      codingRuntime: "local",
      hasEnjoySecret: snap.hasEnjoySecret ?? false,
      verifiedLocal: false
    }),
    null
  )
})

test("当前档案没密钥、另一份启用档案有密钥：不 ready，闸也拦", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready" }],
    [
      { id: "prv_active", kind: "openai", enabled: true, hasKey: false, requiresKey: true, active: true },
      { id: "prv_other", kind: "anthropic", enabled: true, hasKey: true, requiresKey: true, active: false }
    ],
    []
  )
  assert.equal(snap.ready, false)
  assert.equal(snap.hasEnjoySecret, false)
  assert.equal(snap.defaultRoute?.profileId, undefined)
  assert.equal(snap.apiKeys.length, 1)
  assert.equal(
    selectedRouteGateCode({
      skip: false,
      runtimeId: "enjoy-local",
      codingRuntime: "local",
      hasEnjoySecret: snap.hasEnjoySecret ?? false,
      verifiedLocal: false
    }),
    NO_CHAT_ROUTE
  )
})

test("只有已存 API 密钥时 ready，默认 enjoy-local + 档案，载荷不含密钥", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready" }],
    [{ id: "prv_1", kind: "openai", enabled: true, hasKey: true, requiresKey: true, credentialCheck: { state: "ok" } }],
    []
  )
  assert.equal(snap.ready, true)
  assert.equal(snap.defaultRoute?.runtimeId, "enjoy-local")
  assert.equal(snap.defaultRoute?.profileId, "prv_1")
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

test("显式 enjoy-local 时即使已登录 CLI 也不改默认", () => {
  const snap = assembleChatReadiness(
    [{ id: "claude", status: "ready", name: "Claude Code" }],
    [],
    [],
    new Set(["claude"]),
    { explicit: true, preferredRuntimeId: "enjoy-local" }
  )
  assert.equal(snap.defaultRoute?.runtimeId, "enjoy-local")
  assert.equal(snap.ready, false)
})

test("单条 unverified 密钥 ready 且 adopt 该档案", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready" }],
    [
      {
        id: "prv_1",
        kind: "openai",
        enabled: true,
        hasKey: true,
        requiresKey: true,
        credentialCheck: { state: "unverified", code: "timeout" }
      }
    ],
    []
  )
  assert.equal(snap.ready, true)
  assert.equal(snap.defaultRoute?.profileId, "prv_1")
  assert.equal(snap.credentialCheck?.state, "unverified")
})

test("ok 与 unverified 混排 adopt ok", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready" }],
    [
      {
        id: "prv_unverified",
        kind: "openai",
        enabled: true,
        hasKey: true,
        requiresKey: true,
        active: true,
        credentialCheck: { state: "unverified", code: "network" }
      },
      {
        id: "prv_ok",
        kind: "anthropic",
        enabled: true,
        hasKey: true,
        requiresKey: true,
        active: false,
        credentialCheck: { state: "ok" }
      }
    ],
    []
  )
  assert.equal(snap.ready, true)
  assert.equal(snap.defaultRoute?.profileId, "prv_ok")
  assert.equal(snap.credentialCheck?.state, "ok")
})

test("全 invalid 不 ready", () => {
  const snap = assembleChatReadiness(
    [{ id: "enjoy-local", status: "ready" }],
    [
      {
        id: "prv_1",
        kind: "openai",
        enabled: true,
        hasKey: true,
        requiresKey: true,
        credentialCheck: { state: "invalid", code: "auth_rejected" }
      },
      {
        id: "prv_2",
        kind: "anthropic",
        enabled: true,
        hasKey: true,
        requiresKey: true,
        credentialCheck: { state: "invalid", code: "auth_rejected" }
      }
    ],
    []
  )
  assert.equal(snap.ready, false)
})

test("组装快照 ready === 默认路线发送闸放行", () => {
  const cases = [
    {
      name: "key",
      tools: [{ id: "enjoy-local", status: "ready" }],
      providers: [{ id: "prv_1", kind: "openai", enabled: true, hasKey: true, requiresKey: true }],
      live: [] as Array<"ollama" | "lmstudio">,
      loggedIn: new Set<string>()
    },
    {
      name: "cli signed in",
      tools: [{ id: "claude", status: "ready", name: "Claude" }],
      providers: [],
      live: [] as Array<"ollama" | "lmstudio">,
      loggedIn: new Set(["claude"])
    },
    {
      name: "local ping",
      tools: [{ id: "enjoy-local", status: "ready" }],
      providers: [],
      live: ["ollama"] as Array<"ollama" | "lmstudio">,
      loggedIn: new Set<string>()
    },
    {
      name: "remote ollama unverified",
      tools: [{ id: "enjoy-local", status: "ready" }],
      providers: [
        {
          id: "prv_remote",
          kind: "ollama",
          enabled: true,
          hasKey: false,
          requiresKey: false,
          baseURL: "http://10.0.0.8:11434"
        }
      ],
      live: [] as Array<"ollama" | "lmstudio">,
      loggedIn: new Set<string>()
    },
    {
      name: "nothing",
      tools: [{ id: "enjoy-local", status: "ready" }],
      providers: [],
      live: [] as Array<"ollama" | "lmstudio">,
      loggedIn: new Set<string>()
    }
  ]
  for (const item of cases) {
    const snap = assembleChatReadiness(item.tools, item.providers, item.live, item.loggedIn)
    const allows = chatRouteAllowsSend({
      runtimeId: snap.defaultRoute?.runtimeId ?? "enjoy-local",
      hasEnjoySecret: snap.hasEnjoySecret ?? false,
      verifiedLocal: snap.localModels.some(isVerifiedLocalModel),
      credentialState: snap.credentialCheck?.state
    })
    assert.ok(!snap.ready || allows, item.name)
    assert.ok(
      !snap.ready ||
        selectedRouteGateCode({
          skip: false,
          runtimeId: snap.defaultRoute?.runtimeId ?? "enjoy-local",
          codingRuntime: "local",
          hasEnjoySecret: snap.hasEnjoySecret ?? false,
          verifiedLocal: snap.localModels.some(isVerifiedLocalModel),
          credentialState: snap.credentialCheck?.state
        }) === null,
      item.name
    )
  }
})
