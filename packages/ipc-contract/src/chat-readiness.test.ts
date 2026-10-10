import assert from "node:assert/strict"
import { test } from "node:test"
import {
  AgentRunResult,
  ChatReadiness,
  CREDENTIAL_INVALID,
  NO_CHAT_ROUTE,
  apiKeyRoutes,
  buildChatReadiness,
  chatRouteAllowsSend,
  chatRouteGateCode,
  chatRouteGateKind,
  countAvailableEngines,
  isLoopbackModelBaseUrl,
  isVerifiedLocalModel,
  localModelRoutes,
  missingChatRouteCode,
  requireAgentRunId,
  resolveDefaultChatRoute,
  showsAvailableEngine,
  signedInEngineRoutes,
  type ChatApiKeyRoute,
  type ChatEngineRoute,
  type ChatLocalModelRoute
} from "./chat-readiness.ts"

const KEY: ChatApiKeyRoute = { kind: "api_key", providerId: "prov_1", presetId: "openai" }
const CLAUDE: ChatEngineRoute = { kind: "engine", runtimeId: "claude", name: "Claude Code" }
const LOCAL_OK: ChatLocalModelRoute = { kind: "local_model", service: "ollama", verified: true }
const REMOTE: ChatLocalModelRoute = { kind: "local_model", service: "ollama", verified: false }

test("只有已登录外置引擎时 ready，默认路线是该引擎", () => {
  const snap = buildChatReadiness({
    engines: [CLAUDE],
    localModels: [],
    apiKeys: [],
    engineCount: 2
  })
  assert.equal(snap.ready, true)
  assert.equal(snap.engineCount, 2)
  assert.equal(snap.defaultRoute?.runtimeId, "claude")
})

test("只有探测到的本机模型时 ready", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [LOCAL_OK],
    apiKeys: [],
    engineCount: 1
  })
  assert.equal(snap.ready, true)
  assert.equal(snap.defaultRoute?.runtimeId, "enjoy-local")
  assert.deepEqual(snap.localModels, [LOCAL_OK])
})

test("只有已存 API 密钥时 ready，默认 enjoy-local + 档案，载荷不含密钥", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [KEY],
    engineCount: 1,
    credentialCheck: { state: "ok" }
  })
  assert.equal(snap.ready, true)
  assert.equal(snap.defaultRoute?.runtimeId, "enjoy-local")
  assert.equal(snap.defaultRoute?.profileId, "prov_1")
  assert.deepEqual(snap.apiKeys, [KEY])
  assert.equal(JSON.stringify(snap).includes("sk-"), false)
})

test("一条路线都没有时不 ready，默认仍是出厂 enjoy-local", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [],
    engineCount: 3
  })
  assert.equal(snap.ready, false)
  assert.equal(snap.defaultRoute?.runtimeId, "enjoy-local")
  assert.equal(snap.engineCount, 3)
})

test("只有本地引擎、没连模型时不 ready", () => {
  assert.equal(showsAvailableEngine({ id: "enjoy-local", status: "ready" }), true)
  assert.equal(countAvailableEngines([{ id: "enjoy-local", status: "ready" }]), 1)
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [],
    engineCount: countAvailableEngines([{ id: "enjoy-local", status: "ready" }])
  })
  assert.equal(snap.ready, false)
  assert.equal(snap.engineCount, 1)
})

test("comingSoon / skillOnly 不计入引擎数", () => {
  assert.equal(
    countAvailableEngines([
      { id: "enjoy-local", status: "ready" },
      { id: "claude", status: "ready" },
      { id: "soon", status: "ready", comingSoon: true },
      { id: "skill", status: "ready", skillOnly: true }
    ]),
    2
  )
})

test("ChatReadiness 拒未知字段；稳定码是 no_chat_route；defaultRoute 坏了不丢整张", () => {
  assert.equal(NO_CHAT_ROUTE, "no_chat_route")
  assert.throws(() => ChatReadiness.parse({ ready: true, engineCount: 0, extra: 1 }))
  const parsed = ChatReadiness.parse({
    ready: false,
    engineCount: 0,
    engines: [],
    localModels: [],
    apiKeys: []
  })
  assert.equal(parsed.defaultRoute, undefined)
  const recovered = ChatReadiness.parse({
    ready: true,
    engineCount: 1,
    engines: [],
    localModels: [],
    apiKeys: [KEY],
    defaultRoute: { runtimeId: "" }
  })
  assert.equal(recovered.ready, true)
  assert.equal(recovered.defaultRoute, undefined)
  const badFields = ChatReadiness.parse({
    ready: false,
    engineCount: 0,
    engines: [],
    localModels: [],
    apiKeys: [],
    hasEnjoySecret: "yes",
    adoptedHint: { name: "" }
  })
  assert.equal(badFields.hasEnjoySecret, undefined)
  assert.equal(badFields.adoptedHint, undefined)
  const withKeychain = ChatReadiness.parse({
    ready: false,
    engineCount: 0,
    engines: [],
    localModels: [],
    apiKeys: [],
    secretStorageAvailable: false
  })
  assert.equal(withKeychain.secretStorageAvailable, false)
  assert.equal(parsed.secretStorageAvailable, true)
  const badKeychain = ChatReadiness.parse({
    ready: false,
    engineCount: 0,
    engines: [],
    localModels: [],
    apiKeys: [],
    secretStorageAvailable: "no"
  })
  assert.equal(badKeychain.secretStorageAvailable, true)
  const badCheck = ChatReadiness.parse({
    ready: false,
    engineCount: 0,
    engines: [],
    localModels: [],
    apiKeys: [],
    credentialCheck: { state: "nope", message: "401 Unauthorized" }
  })
  assert.equal(badCheck.credentialCheck?.state, "unverified")
  assert.equal(JSON.stringify(badCheck).includes("Unauthorized"), false)
})

test("已登录外置引擎单独构成路线；enjoy-local 即使 loggedIn 也不进 engines", () => {
  const routes = signedInEngineRoutes(
    [
      { id: "enjoy-local", status: "ready", name: "Enjoy Local" },
      { id: "claude", status: "ready", name: "Claude Code" },
      { id: "codex", status: "missing", name: "Codex" }
    ],
    new Set(["enjoy-local", "claude", "codex"])
  )
  assert.deepEqual(routes, [CLAUDE])
})

test("API 密钥路线只要存在与预设 id，不含密钥", () => {
  const routes = apiKeyRoutes([
    { id: "prv_1", kind: "openai", enabled: true, hasKey: true, requiresKey: true },
    { id: "prv_2", kind: "anthropic", enabled: true, hasKey: false, requiresKey: true },
    { id: "prv_3", kind: "ollama", enabled: true, hasKey: false, requiresKey: false }
  ])
  assert.deepEqual(routes, [{ kind: "api_key", providerId: "prv_1", presetId: "openai" }])
  assert.equal(JSON.stringify(routes).includes("sk-"), false)
})

test("本机模型：只认 ping 通过；远端档案 verified:false 不算 ready", () => {
  assert.deepEqual(localModelRoutes(["ollama"], ["lmstudio"]), [
    { kind: "local_model", service: "ollama", verified: true },
    { kind: "local_model", service: "lmstudio", verified: false }
  ])
  const remoteOnly = buildChatReadiness({
    engines: [],
    localModels: [REMOTE],
    apiKeys: [],
    engineCount: 1
  })
  assert.equal(remoteOnly.ready, false)
  assert.equal(isLoopbackModelBaseUrl("http://127.0.0.1:11434"), true)
  assert.equal(isLoopbackModelBaseUrl("http://10.0.0.8:11434"), false)
})

test("agent.run 结果是 { ok, runId|code }；发送闸码在枚举里", () => {
  assert.deepEqual(AgentRunResult.parse({ ok: true, runId: "run_1" }), { ok: true, runId: "run_1" })
  assert.deepEqual(AgentRunResult.parse({ ok: false, code: NO_CHAT_ROUTE }), {
    ok: false,
    code: NO_CHAT_ROUTE
  })
  assert.deepEqual(AgentRunResult.parse({ ok: false, code: "provider_unreachable" }), {
    ok: false,
    code: "provider_unreachable"
  })
  assert.equal(requireAgentRunId({ ok: true, runId: "run_1" }), "run_1")
  assert.throws(() => requireAgentRunId({ ok: false, code: NO_CHAT_ROUTE }), /no_chat_route/)
})

test("missingChatRouteCode 只在没有任何路线时给出 no_chat_route", () => {
  assert.equal(missingChatRouteCode(false), NO_CHAT_ROUTE)
  assert.equal(missingChatRouteCode(true), null)
})

test("未显式选择时第一次连上的可用路线盖过出厂 enjoy-local", () => {
  assert.equal(
    resolveDefaultChatRoute({
      engines: [CLAUDE],
      localModels: [],
      apiKeys: []
    }).runtimeId,
    "claude"
  )
  assert.deepEqual(
    resolveDefaultChatRoute({
      engines: [CLAUDE],
      localModels: [],
      apiKeys: [KEY]
    }),
    { runtimeId: "enjoy-local", profileId: "prov_1" }
  )
  assert.equal(
    resolveDefaultChatRoute({
      explicit: true,
      preferredRuntimeId: "enjoy-local",
      engines: [CLAUDE],
      localModels: [],
      apiKeys: []
    }).runtimeId,
    "enjoy-local"
  )
})

test("闸三分态：无密钥档案 ok；未算过 uncertain；没档案且 ping 失败才拦", () => {
  assert.equal(
    chatRouteGateKind({
      runtimeId: "enjoy-local",
      hasEnjoySecret: true,
      verifiedLocal: false
    }),
    "ok"
  )
  assert.equal(
    chatRouteGateKind({
      runtimeId: "enjoy-local",
      hasEnjoySecret: false,
      verifiedLocal: "unknown"
    }),
    "uncertain"
  )
  assert.equal(
    chatRouteGateKind({
      runtimeId: "enjoy-local",
      codingRuntime: "harness",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    "ok"
  )
  assert.equal(
    chatRouteGateKind({
      runtimeId: "enjoy-local",
      hasEnjoySecret: false,
      verifiedLocal: false
    }),
    "definitely_unusable"
  )
})

test("ready ⇒ 默认路线发送闸放行（未 ready 仍可能放行）", () => {
  const cases: Array<{
    name: string
    explicit?: boolean
    preferredRuntimeId?: string
    engines: ChatEngineRoute[]
    localModels: ChatLocalModelRoute[]
    apiKeys: ChatApiKeyRoute[]
  }> = []
  for (const key of [false, true]) {
    for (const cli of [false, true]) {
      for (const localPing of [false, true]) {
        for (const remote of [false, true]) {
          const localModels: ChatLocalModelRoute[] = []
          if (localPing) localModels.push(LOCAL_OK)
          else if (remote) localModels.push(REMOTE)
          cases.push({
            name: `key=${key} cli=${cli} ping=${localPing} remote=${remote}`,
            engines: cli ? [CLAUDE] : [],
            localModels,
            apiKeys: key ? [KEY] : []
          })
        }
      }
    }
  }
  cases.push({
    name: "explicit enjoy-local + only CLI",
    explicit: true,
    preferredRuntimeId: "enjoy-local",
    engines: [CLAUDE],
    localModels: [],
    apiKeys: []
  })
  cases.push({
    name: "nothing at all",
    engines: [],
    localModels: [],
    apiKeys: []
  })
  for (const input of cases) {
    const snap = buildChatReadiness({ ...input, engineCount: 1 })
    const allows = chatRouteAllowsSend({
      runtimeId: snap.defaultRoute?.runtimeId ?? "enjoy-local",
      hasEnjoySecret: snap.hasEnjoySecret ?? false,
      verifiedLocal: input.localModels.some(isVerifiedLocalModel),
      credentialState: snap.credentialCheck?.state
    })
    assert.ok(!snap.ready || allows, input.name)
  }
})

test("当前档案没密钥、另一份启用档案有密钥：不 ready，闸也拦", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [KEY],
    engineCount: 1,
    hasEnjoySecret: false,
    activeKeyProfileId: null
  })
  assert.equal(snap.ready, false)
  assert.equal(snap.hasEnjoySecret, false)
  assert.equal(snap.defaultRoute?.profileId, undefined)
  assert.equal(
    chatRouteAllowsSend({
      runtimeId: snap.defaultRoute?.runtimeId ?? "enjoy-local",
      hasEnjoySecret: snap.hasEnjoySecret ?? false,
      verifiedLocal: false
    }),
    false
  )
})

test("远端 Ollama：hasSecret 为真则 ready，闸放行", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [REMOTE],
    apiKeys: [],
    engineCount: 1,
    hasEnjoySecret: true
  })
  assert.equal(snap.ready, true)
  assert.equal(
    chatRouteAllowsSend({
      runtimeId: "enjoy-local",
      hasEnjoySecret: true,
      verifiedLocal: false
    }),
    true
  )
})

test("密钥 invalid 不 ready、不 adopt、发送拦 credential_invalid", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [KEY],
    engineCount: 1,
    hasEnjoySecret: true,
    credentialCheck: { state: "invalid", code: "auth_rejected" }
  })
  assert.equal(snap.ready, false)
  assert.equal(snap.credentialCheck?.state, "invalid")
  assert.equal(
    chatRouteGateKind({
      runtimeId: "enjoy-local",
      hasEnjoySecret: true,
      verifiedLocal: false,
      credentialState: "invalid"
    }),
    "definitely_unusable"
  )
  assert.equal(
    chatRouteGateCode({
      runtimeId: "enjoy-local",
      hasEnjoySecret: true,
      verifiedLocal: false,
      credentialState: "invalid"
    }),
    CREDENTIAL_INVALID
  )
})

test("单条 unverified 路线 ready、可 adopt，快照露出 unverified", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [KEY],
    engineCount: 1,
    hasEnjoySecret: true,
    credentialCheck: { state: "unverified", code: "timeout" }
  })
  assert.equal(snap.ready, true)
  assert.equal(snap.defaultRoute?.profileId, "prov_1")
  assert.equal(snap.credentialCheck?.state, "unverified")
  assert.equal(
    chatRouteGateKind({
      runtimeId: "enjoy-local",
      hasEnjoySecret: true,
      verifiedLocal: false,
      credentialState: "unverified"
    }),
    "uncertain"
  )
  assert.equal(
    chatRouteGateCode({
      runtimeId: "enjoy-local",
      hasEnjoySecret: true,
      verifiedLocal: false,
      credentialState: "unverified"
    }),
    null
  )
})

test("带密钥档案缺 credentialCheck 当 unverified：ready 且快照露出 unverified", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [KEY],
    engineCount: 1,
    hasEnjoySecret: true
  })
  assert.equal(snap.ready, true)
  assert.equal(snap.defaultRoute?.profileId, "prov_1")
  assert.equal(snap.credentialCheck?.state, "unverified")
  assert.equal(
    chatRouteGateCode({
      runtimeId: "enjoy-local",
      hasEnjoySecret: true,
      verifiedLocal: false
    }),
    null
  )
})

test("未 adopt 时混排挑 ok 档案；adopt 后跟当前档案，ready/闸一致", () => {
  const other: ChatApiKeyRoute = { kind: "api_key", providerId: "prov_ok", presetId: "anthropic" }
  const keyChecks = {
    prov_1: { state: "unverified" as const, code: "network" as const },
    prov_ok: { state: "ok" as const }
  }
  const picked = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [KEY, other],
    engineCount: 1,
    hasEnjoySecret: true,
    activeKeyProfileId: "prov_1",
    credentialCheck: { state: "unverified", code: "network" },
    keyChecks
  })
  assert.equal(picked.ready, true)
  assert.equal(picked.defaultRoute?.profileId, "prov_ok")
  assert.equal(picked.credentialCheck?.state, "ok")
  const adopted = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [KEY, other],
    engineCount: 1,
    hasEnjoySecret: true,
    adopted: true,
    activeKeyProfileId: "prov_ok",
    credentialCheck: { state: "ok" },
    keyChecks
  })
  assert.equal(adopted.ready, true)
  assert.equal(adopted.defaultRoute?.profileId, "prov_ok")
  assert.equal(adopted.credentialCheck?.state, "ok")
  const stuck = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [KEY, other],
    engineCount: 1,
    hasEnjoySecret: true,
    adopted: true,
    activeKeyProfileId: "prov_1",
    credentialCheck: { state: "invalid", code: "auth_rejected" },
    keyChecks: {
      prov_1: { state: "invalid", code: "auth_rejected" },
      prov_ok: { state: "ok" }
    }
  })
  assert.equal(stuck.ready, false)
  assert.equal(stuck.defaultRoute?.profileId, "prov_1")
  assert.equal(stuck.credentialCheck?.state, "invalid")
})

test("全 invalid 不 ready，向导还差一步", () => {
  const other: ChatApiKeyRoute = { kind: "api_key", providerId: "prov_2", presetId: "anthropic" }
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [KEY, other],
    engineCount: 1,
    hasEnjoySecret: true,
    keyChecks: {
      prov_1: { state: "invalid", code: "auth_rejected" },
      prov_2: { state: "invalid", code: "auth_rejected" }
    }
  })
  assert.equal(snap.ready, false)
  assert.equal(snap.defaultRoute?.profileId, undefined)
})
