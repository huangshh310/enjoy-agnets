import assert from "node:assert/strict"
import { test } from "node:test"
import {
  AgentRunResult,
  ChatReadiness,
  NO_CHAT_ROUTE,
  apiKeyRoutes,
  buildChatReadiness,
  chatRouteAllowsSend,
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
    engineCount: 1
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

test("ChatReadiness 拒未知字段；稳定码是 no_chat_route；defaultRoute 可选", () => {
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

test("ready === 默认路线发送闸放行（key / CLI / 本机 ping / 远端未验证 / 全无）", () => {
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
      hasEnjoySecret: input.apiKeys.length > 0,
      verifiedLocal: input.localModels.some(isVerifiedLocalModel)
    })
    assert.equal(snap.ready, allows, input.name)
  }
})
