import assert from "node:assert/strict"
import { test } from "node:test"
import { agentStopWhen, clampAgentSteps } from "./stop.ts"

test("clampAgentSteps 默认 20，夹在 1–64", () => {
  assert.equal(clampAgentSteps(), 20)
  assert.equal(clampAgentSteps(0), 20)
  assert.equal(clampAgentSteps(3.9), 3)
  assert.equal(clampAgentSteps(99), 64)
})

test("agentStopWhen 返回含 stepCountIs 与 isLoopFinished 的数组", () => {
  const conditions = agentStopWhen(8)
  assert.ok(Array.isArray(conditions))
  assert.equal(conditions.length, 2)
  for (const item of conditions) assert.equal(typeof item, "function")
})

test("stopAfterTools 追加 hasToolCall", () => {
  const conditions = agentStopWhen({ maxSteps: 4, stopAfterTools: ["code_mode"] })
  assert.equal(conditions.length, 3)
})
