/**
 * #175 soft：failedTurnRoute 纯函数——失败卡 runtimeId / providerId 盖章规则。
 * （failcard-p2.behavior 走 failAgentPump 集成；这里锁表本身，防回归时只靠集成测。）
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { failedTurnRoute } from "./failed-turn-route.ts"

test("Enjoy 本地：有 profileId 就带；没有只带 runtimeId", () => {
  assert.deepEqual(
    failedTurnRoute({ input: { runtimeId: "enjoy-local" }, profileId: "prv_openai" }, () => ({})),
    { runtimeId: "enjoy-local", providerId: "prv_openai" }
  )
  assert.deepEqual(failedTurnRoute({ input: { runtimeId: "enjoy-local" } }, () => ({})), {
    runtimeId: "enjoy-local"
  })
})

test("Enjoy 本地：runtimeId 空 / 空白 → 当 enjoy-local", () => {
  assert.deepEqual(
    failedTurnRoute({ input: { runtimeId: "  " }, profileId: "prv_ollama" }, () => ({})),
    { runtimeId: "enjoy-local", providerId: "prv_ollama" }
  )
  assert.deepEqual(failedTurnRoute({ input: { runtimeId: null }, profileId: "prv_x" }, () => ({})), {
    runtimeId: "enjoy-local",
    providerId: "prv_x"
  })
})

test("ACP：绑了档案（useCustomProvider + providerId）才带；没绑 / 只填 providerId 不带", () => {
  const bound = () => ({ amp: { useCustomProvider: true, providerId: "prv_gw" } })
  assert.deepEqual(failedTurnRoute({ input: { runtimeId: "amp" }, profileId: "prv_chat" }, bound), {
    runtimeId: "amp",
    providerId: "prv_gw"
  })
  assert.deepEqual(
    failedTurnRoute({ input: { runtimeId: "amp" }, profileId: "prv_chat" }, () => ({})),
    { runtimeId: "amp" }
  )
  assert.deepEqual(
    failedTurnRoute(
      { input: { runtimeId: "amp" } },
      () => ({ amp: { useCustomProvider: false, providerId: "prv_gw" } })
    ),
    { runtimeId: "amp" }
  )
  assert.deepEqual(
    failedTurnRoute(
      { input: { runtimeId: "amp" } },
      () => ({ amp: { useCustomProvider: true, providerId: "" } })
    ),
    { runtimeId: "amp" }
  )
})
