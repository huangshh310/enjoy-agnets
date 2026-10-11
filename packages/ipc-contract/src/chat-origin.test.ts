import assert from "node:assert/strict"
import { test } from "node:test"
import { coerceAgentRunOrigin, inferAgentRunOrigin, isUserInitiatedRunOrigin } from "./agent-run-origin.ts"

test("缺省与 user 算用户开跑，三种无人值守不算", () => {
  assert.equal(isUserInitiatedRunOrigin(undefined), true)
  assert.equal(isUserInitiatedRunOrigin("user"), true)
  assert.equal(isUserInitiatedRunOrigin("heartbeat"), false)
  assert.equal(isUserInitiatedRunOrigin("automation"), false)
  assert.equal(isUserInitiatedRunOrigin("catch_up"), false)
})

test("回挂优先已写 origin，不用 hb_ 前缀猜", () => {
  assert.equal(inferAgentRunOrigin("heartbeat"), "heartbeat")
  assert.equal(inferAgentRunOrigin("hb_tick_1"), "user")
  assert.equal(coerceAgentRunOrigin("hb_tick_1"), undefined)
  assert.equal(inferAgentRunOrigin(undefined, { automationId: "a", isCatchUp: true }), "catch_up")
  assert.equal(inferAgentRunOrigin(undefined, { automationId: "a", isCatchUp: false }), "automation")
  assert.equal(inferAgentRunOrigin(undefined), "user")
})
