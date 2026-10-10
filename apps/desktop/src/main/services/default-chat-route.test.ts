/**
 * 自动收默认只锁一次，不改写已有偏好。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  adoptedRouteLabel,
  formatAdoptedRouteFace,
  planAdoptedDefaultRoute
} from "./default-chat-route.ts"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

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

test("单条 unverified 密钥 ready，从无到有可 adopt", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [{ kind: "api_key", providerId: "prov_1", presetId: "openai" }],
    engineCount: 1,
    hasEnjoySecret: true,
    credentialCheck: { state: "unverified", code: "timeout" }
  })
  assert.equal(snap.ready, true)
  assert.equal(snap.defaultRoute?.profileId, "prov_1")
  assert.equal(
    planAdoptedDefaultRoute({
      ready: snap.ready,
      routeRuntimeId: snap.defaultRoute?.runtimeId,
      hadNoUsableRoute: true
    }),
    "adopt"
  )
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
