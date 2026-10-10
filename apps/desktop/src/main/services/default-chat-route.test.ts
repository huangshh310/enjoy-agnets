/**
 * 自动收默认只锁一次，不改写已有偏好。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  ADOPTED_DEFAULT_ROUTE_AT_KEY,
  adoptedRouteLabel,
  formatAdoptedRouteFace,
  persistAdoptedDefaultRoute,
  planAdoptedDefaultRoute,
  SEEN_NO_USABLE_CHAT_ROUTE_KEY,
  shouldNoteSeenNoUsableRoute,
  type AdoptRouteStore
} from "./default-chat-route.ts"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

test("seen no route 只在 inspect+ping 结束后、且当时还不 ready 才记", () => {
  assert.equal(shouldNoteSeenNoUsableRoute({ ready: false, probesSettled: false }), false)
  assert.equal(shouldNoteSeenNoUsableRoute({ ready: false, probesSettled: true }), true)
  assert.equal(shouldNoteSeenNoUsableRoute({ ready: true, probesSettled: true }), false)
  assert.equal(
    shouldNoteSeenNoUsableRoute({ ready: false, probesSettled: true, adoptedAt: "1" }),
    false
  )
})

test("第一次从无到有才 adopt；已锁或显式跳过", () => {
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      routeRuntimeId: "claude",
      hadNoUsableRoute: true
    }),
    "adopt"
  )
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      routeRuntimeId: "claude",
      adoptedAt: "1",
      hadNoUsableRoute: true
    }),
    "skip"
  )
  assert.equal(
    planAdoptedDefaultRoute({
      explicit: true,
      ready: true,
      routeRuntimeId: "claude",
      hadNoUsableRoute: true
    }),
    "skip"
  )
  assert.equal(planAdoptedDefaultRoute({ ready: false, routeRuntimeId: "claude" }), "skip")
})

test("升级首次已有路线只 stamp，不 toast", () => {
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      routeRuntimeId: "claude",
      hadNoUsableRoute: false
    }),
    "stamp"
  )
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      currentRuntimeId: "codex",
      routeRuntimeId: "claude",
      hadNoUsableRoute: false
    }),
    "stamp"
  )
})

test("已有非出厂偏好只盖章不改写", () => {
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      currentRuntimeId: "codex",
      routeRuntimeId: "claude",
      hadNoUsableRoute: true
    }),
    "lock"
  )
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      currentRuntimeId: "enjoy-local",
      routeRuntimeId: "claude",
      hadNoUsableRoute: true
    }),
    "adopt"
  )
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      currentRuntimeId: "claude",
      routeRuntimeId: "claude",
      hadNoUsableRoute: true
    }),
    "adopt"
  )
})

test("adopt 只打一次偏好与盖章", () => {
  const writes: string[] = []
  const kv = new Map<string, string>([[SEEN_NO_USABLE_CHAT_ROUTE_KEY, "1"]])
  const store: AdoptRouteStore = {
    get: (key) => kv.get(key),
    set: (key, value) => {
      writes.push(key)
      kv.set(key, value)
    },
    readRuntimeId: () => "enjoy-local",
    writeRuntimeId: (runtimeId) => {
      writes.push(`runtime:${runtimeId}`)
    }
  }
  const snap = buildChatReadiness({
    engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
    localModels: [],
    apiKeys: [],
    engineCount: 1
  })
  const first = persistAdoptedDefaultRoute(snap, { store, probesSettled: true })
  assert.equal(first.adopted, true)
  assert.deepEqual(writes, [ADOPTED_DEFAULT_ROUTE_AT_KEY, "runtime:claude"])
  writes.length = 0
  const second = persistAdoptedDefaultRoute(snap, { store, probesSettled: true })
  assert.equal(second.adopted, false)
  assert.deepEqual(writes, [])
})

test("adopt 提示用引擎显示名，不是 id", () => {
  const engine = buildChatReadiness({
    engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
    localModels: [],
    apiKeys: [],
    engineCount: 1
  })
  assert.equal(adoptedRouteLabel(engine), "Claude Code")
  const keyed = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [{ kind: "api_key", providerId: "e2e", presetId: "openai" }],
    engineCount: 1,
    modelId: "gpt-4o"
  })
  assert.match(adoptedRouteLabel(keyed), /OpenAI/)
  assert.doesNotMatch(adoptedRouteLabel(keyed), /^openai$/)
  assert.equal(
    formatAdoptedRouteFace({ providerName: "DeepSeek", modelLabel: "DeepSeek V3" }),
    "DeepSeek · V3"
  )
})
