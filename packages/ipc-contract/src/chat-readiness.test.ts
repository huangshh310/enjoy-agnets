import assert from "node:assert/strict"
import { test } from "node:test"
import {
  ChatReadiness,
  NO_CHAT_ROUTE,
  apiKeyRoutes,
  buildChatReadiness,
  countAvailableEngines,
  localModelRoutes,
  missingChatRouteCode,
  showsAvailableEngine,
  signedInEngineRoutes
} from "./chat-readiness.ts"

test("只有已登录外置引擎时 ready", () => {
  const snap = buildChatReadiness({
    engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
    localModels: [],
    apiKeys: [],
    engineCount: 2
  })
  assert.equal(snap.ready, true)
  assert.equal(snap.engineCount, 2)
  assert.equal(snap.engines[0]?.runtimeId, "claude")
})

test("只有探测到的本机模型时 ready", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [{ kind: "local_model", service: "ollama" }],
    apiKeys: [],
    engineCount: 1
  })
  assert.equal(snap.ready, true)
  assert.deepEqual(snap.localModels, [{ kind: "local_model", service: "ollama" }])
})

test("只有已存 API 密钥时 ready，载荷不含密钥", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [{ kind: "api_key", providerId: "prov_1", presetId: "openai" }],
    engineCount: 1
  })
  assert.equal(snap.ready, true)
  assert.deepEqual(snap.apiKeys, [{ kind: "api_key", providerId: "prov_1", presetId: "openai" }])
  assert.equal(JSON.stringify(snap).includes("sk-"), false)
})

test("一条路线都没有时不 ready", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [],
    engineCount: 3
  })
  assert.equal(snap.ready, false)
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

test("ChatReadiness 拒未知字段；稳定码是 no_chat_route", () => {
  assert.equal(NO_CHAT_ROUTE, "no_chat_route")
  assert.throws(() => ChatReadiness.parse({ ready: true, engineCount: 0, extra: 1 }))
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
  assert.deepEqual(routes, [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }])
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

test("本机模型：现场探测或已启用档案都算；去重", () => {
  assert.deepEqual(localModelRoutes(["ollama"], ["lmstudio", "openai"]), [
    { kind: "local_model", service: "ollama" },
    { kind: "local_model", service: "lmstudio" }
  ])
})

test("missingChatRouteCode 只在没有任何路线时给出 no_chat_route", () => {
  assert.equal(missingChatRouteCode(false), NO_CHAT_ROUTE)
  assert.equal(missingChatRouteCode(true), null)
})
