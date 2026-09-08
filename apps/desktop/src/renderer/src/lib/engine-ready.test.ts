import assert from "node:assert/strict"
import { test } from "node:test"
import { canSwitchAgent, isEngineReady } from "./engine-ready.ts"

test("就绪灯只信 status===ready", () => {
  assert.equal(isEngineReady({ id: "enjoy-local", status: "missing" }), true)
  assert.equal(isEngineReady({ id: "cursor", status: "ready" }), true)
  assert.equal(isEngineReady({ id: "cursor", status: "missing" }), false)
})

test("comingSoon / 未就绪不能切", () => {
  assert.equal(canSwitchAgent({ id: "claude", status: "missing" }), false)
  assert.equal(canSwitchAgent({ id: "claude", status: "comingSoon", comingSoon: true }), false)
  assert.equal(canSwitchAgent({ id: "claude", status: "ready" }), true)
})
