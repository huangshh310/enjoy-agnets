/**
 * 自动收默认只锁一次，不改写已有偏好。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { adoptedRouteLabel, planAdoptedDefaultRoute } from "./default-chat-route.ts"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

test("第一次从无到有才 adopt；已锁或显式跳过", () => {
  assert.equal(
    planAdoptedDefaultRoute({ ready: true, routeRuntimeId: "claude" }),
    "adopt"
  )
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      routeRuntimeId: "claude",
      adoptedAt: "1"
    }),
    "skip"
  )
  assert.equal(
    planAdoptedDefaultRoute({
      explicit: true,
      ready: true,
      routeRuntimeId: "claude"
    }),
    "skip"
  )
  assert.equal(planAdoptedDefaultRoute({ ready: false, routeRuntimeId: "claude" }), "skip")
})

test("已有非出厂偏好只盖章不改写", () => {
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      currentRuntimeId: "codex",
      routeRuntimeId: "claude"
    }),
    "lock"
  )
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      currentRuntimeId: "enjoy-local",
      routeRuntimeId: "claude"
    }),
    "adopt"
  )
  assert.equal(
    planAdoptedDefaultRoute({
      ready: true,
      currentRuntimeId: "claude",
      routeRuntimeId: "claude"
    }),
    "adopt"
  )
})

test("adopt 提示用引擎名或预设 id", () => {
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
    engineCount: 1
  })
  assert.equal(adoptedRouteLabel(keyed), "openai")
})
