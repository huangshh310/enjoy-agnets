import assert from "node:assert/strict"
import { test } from "node:test"
import { coerceAgentRunOrigin, inferAgentRunOrigin, isUserInitiatedRunOrigin } from "./agent-run-origin.ts"

test("只有显式 user 算用户开跑，缺省与未知失败关闭", () => {
  assert.equal(isUserInitiatedRunOrigin("user"), true)
  assert.equal(isUserInitiatedRunOrigin(undefined), false)
  assert.equal(isUserInitiatedRunOrigin("heartbeat"), false)
  assert.equal(isUserInitiatedRunOrigin("automation"), false)
  assert.equal(isUserInitiatedRunOrigin("catch_up"), false)
  assert.equal(isUserInitiatedRunOrigin("ghost"), false)
  assert.equal(isUserInitiatedRunOrigin("hb_tick_1"), false)
})

test("回挂优先已写 origin，不用 hb_ 前缀猜，也不默认成 user", () => {
  assert.equal(inferAgentRunOrigin("heartbeat"), "heartbeat")
  assert.equal(inferAgentRunOrigin("hb_tick_1"), undefined)
  assert.equal(coerceAgentRunOrigin("hb_tick_1"), undefined)
  assert.equal(inferAgentRunOrigin(undefined, { automationId: "a", isCatchUp: true }), "catch_up")
  assert.equal(inferAgentRunOrigin(undefined, { automationId: "a", isCatchUp: false }), "automation")
  assert.equal(inferAgentRunOrigin(undefined), undefined)
})
